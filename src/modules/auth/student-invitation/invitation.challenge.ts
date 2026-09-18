import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { sendOTP } from "@/modules/auth/services/email.service";
import { RegistrationChallengeRepository } from "@/modules/auth/registration/registration.challenge.repo";
import { getRegistrationConfig } from "@/modules/auth/registration/registration.config";
import { parseDirectusUtcDateTime } from "@/modules/auth/registration/registration.timestamps";
import {
  computeOtpHmac,
  generateChallengeId,
  generateOtp,
  maskEmail,
  verifyOtpHmac,
} from "@/modules/auth/registration/registration.crypto";
import type { StudentInvitationErrorCode } from "./errors";

export const STUDENT_INVITATION_CHALLENGE_COOKIE_NAME =
  "vs_student_invite_challenge";
export const STUDENT_INVITATION_CHALLENGE_COOKIE_PATH = "/api/student-invitations";

type ChallengeContext = {
  readonly invitationId: number;
  readonly userId: string | number;
  readonly email: string;
};

export type InvitationChallengeStartResult = {
  readonly emailMasked: string;
  readonly otpExpiresAt: string;
  readonly resendAvailableAt: string;
  readonly attemptsRemaining: number;
};

/** Expected invitation challenge failure safe for route-level translation. */
export class InvitationChallengeError extends Error {
  public readonly name = "InvitationChallengeError";

  constructor(
    public readonly statusCode: 400 | 409 | 429 | 503,
    public readonly code: StudentInvitationErrorCode,
    public readonly resendAvailableAt?: string,
    public readonly attemptsRemaining?: number
  ) {
    super("Student invitation challenge could not be completed.");
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseRequiredUtcTimestamp(value: unknown): number {
  const timestamp = parseDirectusUtcDateTime(value);
  if (!Number.isFinite(timestamp)) {
    throw new InvitationChallengeError(503, "SERVICE_UNAVAILABLE");
  }
  return timestamp;
}

function bindingDigest(context: ChallengeContext): string {
  const binding = `${context.invitationId}\u0000${String(context.userId)}`;
  return crypto.createHash("sha256").update(binding, "utf8").digest("hex");
}

function challengeMatches(
  challenge: Awaited<
    ReturnType<RegistrationChallengeRepository["getChallengeById"]>
  >,
  context: ChallengeContext
): boolean {
  return (
    challenge !== null &&
    challenge.role === "FREELANCER" &&
    challenge.email_normalized === normalizeEmail(context.email) &&
    challenge.payload_digest === bindingDigest(context)
  );
}

/** Start or resend the roster-mailbox challenge bound to one invitation/account. */
export async function startInvitationChallenge(
  context: ChallengeContext
): Promise<InvitationChallengeStartResult> {
  const config = getRegistrationConfig();
  const repo = new RegistrationChallengeRepository();
  const cookieStore = await cookies();
  const priorId = cookieStore.get(STUDENT_INVITATION_CHALLENGE_COOKIE_NAME)?.value;
  const prior = priorId ? await repo.getChallengeById(priorId) : null;
  const now = Date.now();
  const otp = generateOtp();
  const otpExpiresAt = new Date(now + config.otpLifetimeMs).toISOString();
  const resendAvailableAt = new Date(now + config.resendCooldownMs).toISOString();
  const payloadDigest = bindingDigest(context);
  if (prior !== null && challengeMatches(prior, context)) {
    if (prior.status === "VERIFYING" || prior.status === "CONSUMED") {
      // A consumed challenge already proved mailbox control; acceptance stays
      // in progress until the account link is confirmed.
      throw new InvitationChallengeError(
        409,
        "INVITATION_CHALLENGE_IN_PROGRESS"
      );
    }
  }
  let challengeId: string;
  let stateVersion: number;
  let attemptsRemaining: number;
  if (
    prior !== null &&
    challengeMatches(prior, context) &&
    (prior.status === "ACTIVE" || prior.status === "LOCKED") &&
    parseRequiredUtcTimestamp(prior.expires_at) > now
  ) {
    const priorResendAt =
      parseRequiredUtcTimestamp(prior.last_sent_at) + config.resendCooldownMs;
    if (now < priorResendAt) {
      throw new InvitationChallengeError(
        429,
        "RATE_LIMITED",
        new Date(priorResendAt).toISOString(),
        Math.max(0, prior.max_attempts - prior.attempts)
      );
    }
    if (prior.resend_count >= config.maxResends) {
      throw new InvitationChallengeError(429, "RATE_LIMITED");
    }

    const updated = await repo.updateOnResend(prior.challenge_id, prior.state_version, {
        otpHmac: computeOtpHmac(
          prior.challenge_id,
          otp,
          config.otpHmacSecret
        ),
        payloadDigest,
        expiresAt: otpExpiresAt,
        lastSentAt: new Date(now).toISOString(),
        resendCount: prior.resend_count + 1,
    });
    challengeId = updated.challenge_id;
    stateVersion = updated.state_version;
    attemptsRemaining = updated.max_attempts;
  } else {
    challengeId = generateChallengeId();
    const created = await repo.createChallenge({
      challenge_id: challengeId,
      email_normalized: normalizeEmail(context.email),
      role: "FREELANCER",
      otp_hmac: computeOtpHmac(challengeId, otp, config.otpHmacSecret),
      attempts: 0,
      max_attempts: config.maxOtpAttempts,
      resend_count: 0,
      last_sent_at: new Date(now).toISOString(),
      expires_at: otpExpiresAt,
      payload_digest: payloadDigest,
      payload_version: 1,
      status: "ACTIVE",
      state_version: 0,
      request_ip_hash: null,
    });
    stateVersion = created.state_version;
    attemptsRemaining = created.max_attempts;
  }

  try {
    await sendOTP(normalizeEmail(context.email), otp, { purpose: "school" });
  } catch {
    await repo.cancelChallenge(challengeId, stateVersion);
    throw new InvitationChallengeError(503, "SERVICE_UNAVAILABLE");
  }
  cookieStore.set({
    name: STUDENT_INVITATION_CHALLENGE_COOKIE_NAME,
    value: challengeId,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: STUDENT_INVITATION_CHALLENGE_COOKIE_PATH,
    maxAge: Math.ceil(config.challengeLifetimeMs / 1000),
  });

  return {
    emailMasked: maskEmail(context.email),
    otpExpiresAt,
    resendAvailableAt,
    attemptsRemaining,
  };
}

/** Verify and consume the cookie-bound challenge for one invitation/account. */
export async function verifyInvitationChallenge(
  otp: string,
  context: ChallengeContext
): Promise<void> {
  const config = getRegistrationConfig();
  const cookieStore = await cookies();
  const challengeId = cookieStore.get(STUDENT_INVITATION_CHALLENGE_COOKIE_NAME)?.value;
  if (!challengeId) throw new InvitationChallengeError(400, "OTP_REQUIRED");

  const repo = new RegistrationChallengeRepository();
  const challenge = await repo.getChallengeById(challengeId);
  if (challenge === null || !challengeMatches(challenge, context)) {
    throw new InvitationChallengeError(400, "OTP_REQUIRED");
  }
  if (challenge.status === "CONSUMED") return;
  if (challenge.status === "LOCKED") {
    throw new InvitationChallengeError(
      409,
      "INVITATION_CHALLENGE_LOCKED",
      undefined,
      0
    );
  }
  if (challenge.status === "EXPIRED") {
    throw new InvitationChallengeError(400, "OTP_EXPIRED");
  }
  if (challenge.status !== "ACTIVE" && challenge.status !== "VERIFYING") {
    throw new InvitationChallengeError(400, "OTP_REQUIRED");
  }
  const challengeExpiresAt = parseDirectusUtcDateTime(challenge.expires_at);
  if (!Number.isFinite(challengeExpiresAt) || Date.now() >= challengeExpiresAt) {
    throw new InvitationChallengeError(400, "OTP_EXPIRED");
  }

  const leaseExpiresAt = parseDirectusUtcDateTime(
    challenge.verification_lease_expires_at
  );
  if (
    challenge.status === "VERIFYING" &&
    (!challenge.verification_lease_id ||
      !Number.isFinite(leaseExpiresAt) ||
      Date.now() < leaseExpiresAt)
  ) {
    throw new InvitationChallengeError(
      409,
      "INVITATION_CHALLENGE_IN_PROGRESS"
    );
  }
  const activeChallenge =
    challenge.status === "VERIFYING"
      ? await repo.releaseVerificationLease(
          challengeId,
          challenge.state_version,
          true,
          challenge.verification_lease_id ?? undefined
        )
      : challenge;

  if (
    !verifyOtpHmac(
      challengeId,
      otp,
      activeChallenge.otp_hmac,
      config.otpHmacSecret
    )
  ) {
    const attempt = await repo.recordFailedAttempt(
      challengeId,
      activeChallenge.attempts,
      activeChallenge.max_attempts,
      activeChallenge.state_version
    );
    throw new InvitationChallengeError(
      attempt.isLocked ? 409 : 400,
      attempt.isLocked ? "INVITATION_CHALLENGE_LOCKED" : "OTP_INVALID",
      undefined,
      Math.max(0, activeChallenge.max_attempts - attempt.attempts)
    );
  }

  const leaseId = crypto.randomUUID();
  const leased = await repo.acquireVerificationLease(
    challengeId,
    activeChallenge.state_version,
    leaseId,
    new Date(Date.now() + config.verificationLeaseDurationMs).toISOString()
  );
  await repo.consumeChallenge(challengeId, leased.state_version, leaseId);
}
