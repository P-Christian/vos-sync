import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticateCookieSession,
  isFreelancerSession,
} from "@/lib/authenticated-session";
import { REGISTRATION_CONSTANTS } from "@/modules/auth/registration/registration.config";
import {
  completeOwnedAcceptance,
  StudentInvitationAcceptanceError,
} from "@/modules/auth/student-invitation/invitation.acceptance";
import {
  InvitationChallengeError,
  startInvitationChallenge,
} from "@/modules/auth/student-invitation/invitation.challenge";
import {
  findInvitationByToken,
  findStudentById,
} from "@/modules/auth/student-invitation/invitation.repo";
import {
  getInvitationState,
  isLinkedToSession,
} from "@/modules/auth/student-invitation/invitation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const claimSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9_-]+$/u),
  })
  .strict();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_REQUESTS = REGISTRATION_CONSTANTS.RATE_LIMIT_EMAIL_HOURLY;
const MAX_RATE_LIMIT_KEYS = 20_000;
const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

type RateLimitEntry = {
  readonly requests: number;
  readonly resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

function claimJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function exceedsClaimRateLimit(keys: readonly string[], now: number): boolean {
  if (rateLimits.size >= MAX_RATE_LIMIT_KEYS) {
    for (const [key, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(key);
    }
    if (rateLimits.size >= MAX_RATE_LIMIT_KEYS) return true;
  }

  if (
    keys.some((key) => {
      const entry = rateLimits.get(key);
      return entry !== undefined &&
        entry.resetAt > now &&
        entry.requests >= RATE_LIMIT_REQUESTS;
    })
  ) {
    return true;
  }

  for (const key of keys) {
    const entry = rateLimits.get(key);
    rateLimits.set(
      key,
      !entry || entry.resetAt <= now
        ? { requests: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }
        : { ...entry, requests: entry.requests + 1 }
    );
  }
  return false;
}

/** Validate an invitation claim and start roster-email verification when needed. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await authenticateCookieSession();
  if (!session) {
    return claimJson(
      { error: "Authentication required.", code: "UNAUTHENTICATED" },
      401
    );
  }
  if (!isFreelancerSession(session)) {
    return claimJson(
      {
        error: "Invitation cannot be accepted.",
        code: "INVITATION_ROLE_INVALID",
      },
      409
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return claimJson(
      { error: "Invalid request.", code: "INVALID_REQUEST" },
      400
    );
  }
  const input = claimSchema.safeParse(body);
  if (!input.success) {
    return claimJson(
      { error: "Invalid request.", code: "INVALID_REQUEST" },
      400
    );
  }

  const invitationKey = crypto
    .createHash("sha256")
    .update(input.data.token, "utf8")
    .digest("hex");
  if (
    exceedsClaimRateLimit(
      [`user:${String(session.userId)}`, `invitation:${invitationKey}`],
      Date.now()
    )
  ) {
    return claimJson(
      { error: "Too many requests.", code: "RATE_LIMITED" },
      429
    );
  }

  try {
    const invitation = await findInvitationByToken(input.data.token);
    const student = invitation
      ? await findStudentById(invitation.student_id)
      : null;
    const state = getInvitationState(invitation, student, Date.now());
    if (!invitation || !student || state === "invalid") {
      return claimJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_INVALID" },
        400
      );
    }
    if (state === "registered") {
      if (!isLinkedToSession(student, session.userId)) {
        return claimJson(
          {
            error: "Invitation cannot be accepted.",
            code: "INVITATION_OWNERSHIP_CONFLICT",
          },
          409
        );
      }
      await completeOwnedAcceptance({
        sessionUserId: session.userId,
        invitation,
        student,
      });
      return claimJson({ state: "linked" });
    }
    if (state === "expired") {
      return claimJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_EXPIRED" },
        400
      );
    }
    if (state === "used") {
      return claimJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_USED" },
        400
      );
    }
    if (!student.email) {
      return claimJson(
        { error: "Invitation cannot be accepted.", code: "INVITATION_INVALID" },
        400
      );
    }

    const accountEmail = session.user.user_email?.trim().toLowerCase();
    const rosterEmail = student.email.trim().toLowerCase();
    if (!accountEmail || !rosterEmail) {
      return claimJson(
        {
          error: "Invitation service is unavailable.",
          code: "SERVICE_UNAVAILABLE",
        },
        503
      );
    }
    if (accountEmail === rosterEmail) {
      return claimJson({
        mode: "same_email",
        notice: "No additional verification code is needed.",
      });
    }

    const challenge = await startInvitationChallenge({
      invitationId: invitation.invitation_id,
      userId: session.userId,
      email: rosterEmail,
    });
    return claimJson({ mode: "otp_sent", ...challenge });
  } catch (error: unknown) {
    if (error instanceof StudentInvitationAcceptanceError) {
      return claimJson(
        {
          error:
            error.statusCode === 503
              ? "Invitation service is unavailable."
              : "Invitation cannot be accepted.",
          code: error.code,
        },
        error.statusCode
      );
    }
    if (error instanceof InvitationChallengeError) {
      return claimJson(
        {
          error:
            error.statusCode === 429
              ? "Too many requests."
              : "Verification could not be started.",
          code: error.code,
          ...(error.resendAvailableAt
            ? { resendAvailableAt: error.resendAvailableAt }
            : {}),
          ...(error.attemptsRemaining !== undefined
            ? { attemptsRemaining: error.attemptsRemaining }
            : {}),
        },
        error.statusCode
      );
    }
    console.error("[student-invitation.claim] Request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return claimJson(
      { error: "Invitation service is unavailable.", code: "SERVICE_UNAVAILABLE" },
      503
    );
  }
}
