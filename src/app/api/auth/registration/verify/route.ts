import { NextRequest } from "next/server";
import { COOKIE_NAME, getCookieOptions } from "@/lib/auth-utils";
import {
  clearRegistrationChallengeCookie,
  getChallengeId,
  handleRegistrationRouteError,
  parseRegistrationJson,
  RegistrationChallengeRepository,
  RegistrationError,
  RegistrationProvisioningService,
  registrationJson,
  RegistrationService,
  requireRegistrationV2,
  verifyOtpInputSchema,
} from "@/modules/auth/registration";
import {
  getJwtVerificationSecret,
  issueRegistrationAttachmentToken,
  issueRegistrationSession,
} from "@/modules/auth/registration/registration.session";
import {
  findInvitationByToken,
  findStudentById,
} from "@/modules/auth/student-invitation/invitation.repo";
import { getInvitationState } from "@/modules/auth/student-invitation/invitation.service";
import { issueWelcomeDeferral } from "@/modules/auth/student-invitation/welcome-deferral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WELCOME_DEFERRAL_COOKIE_NAME = "vs_welcome_pending";
const WELCOME_DEFERRAL_COOKIE_MAX_AGE_SECONDS = 86_400;

export async function POST(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  const challengeRepo = new RegistrationChallengeRepository();
  let lease:
    | Awaited<ReturnType<RegistrationService["verifyOtpAndAcquireLease"]>>
    | undefined;
  try {
    // Fail before OTP state changes if session signing is not configured.
    getJwtVerificationSecret();
    const challengeId = getChallengeId(request);
    const input = await parseRegistrationJson(request, verifyOtpInputSchema);
    const invitationToken = request.headers
      .get("x-student-invitation-token")
      ?.trim();
    let welcomeDeferralInvitationId: number | null = null;
    if (invitationToken) {
      try {
        const invitation = await findInvitationByToken(invitationToken);
        const student = invitation
          ? await findStudentById(invitation.student_id)
          : null;
        if (getInvitationState(invitation, student, Date.now()) === "valid") {
          welcomeDeferralInvitationId = invitation?.invitation_id ?? null;
        }
      } catch {
        welcomeDeferralInvitationId = null;
      }
    }
    lease = await new RegistrationService(
      challengeRepo
    ).verifyOtpAndAcquireLease(
      challengeId,
      input.otp,
      input.sealedPayload
    );

    // Defer the welcome email ONLY for invitation-originated FREELANCER
    // registrations. CLIENT, SCH_ADMIN, and non-invitation FREELANCER
    // registrations keep the immediate welcome and never receive the
    // vs_welcome_pending pass.
    const deferWelcomeEmail =
      welcomeDeferralInvitationId !== null &&
      lease.payload.role === "FREELANCER";

    const provisioningService = new RegistrationProvisioningService();
    const user = deferWelcomeEmail
      ? await provisioningService.provision(lease.challenge, lease.payload, {
          deferWelcomeEmail: true,
        })
      : await provisioningService.provision(lease.challenge, lease.payload);
    await challengeRepo.consumeChallenge(
      challengeId,
      lease.challenge.state_version,
      lease.leaseId
    );

    const session = await issueRegistrationSession(user);
    const attachmentToken = await issueRegistrationAttachmentToken(user);
    let response = registrationJson({
      ok: true,
      role: lease.payload.role,
      destination: session.destination,
      attachmentToken,
    });
    // Clear the narrow challenge cookie first and write the root auth cookie
    // last. This is robust to development proxies that incorrectly retain
    // only the final Set-Cookie header from a multi-cookie response.
    response = clearRegistrationChallengeCookie(response);
    if (deferWelcomeEmail && welcomeDeferralInvitationId !== null) {
      response.cookies.set({
        name: WELCOME_DEFERRAL_COOKIE_NAME,
        value: issueWelcomeDeferral(
          user.user_id,
          welcomeDeferralInvitationId
        ),
        ...getCookieOptions(
          true,
          "/",
          WELCOME_DEFERRAL_COOKIE_MAX_AGE_SECONDS
        ),
      });
    }
    response.cookies.set({
      name: COOKIE_NAME,
      value: session.token,
      ...getCookieOptions(true),
    });
    return response;
  } catch (error) {
    const terminalCompanyConflict =
      error instanceof RegistrationError &&
      (error.code === "COMPANY_EMAIL_CONFLICT" ||
        error.code === "COMPANY_TIN_CONFLICT");
    const terminalSchoolConflict =
      error instanceof RegistrationError && error.code === "SCHOOL_CONFLICT";
    let releasedChallenge:
      | Awaited<ReturnType<RegistrationChallengeRepository["releaseVerificationLease"]>>
      | undefined;
    if (lease) {
      try {
        releasedChallenge = await challengeRepo.releaseVerificationLease(
          lease.challenge.challenge_id,
          lease.challenge.state_version,
          true,
          lease.leaseId
        );
      } catch {
        // The consume may have committed or the lease may have expired. A
        // later retry reconciles by registration_key before creating records.
      }
    }

    if ((terminalCompanyConflict || terminalSchoolConflict) && lease && releasedChallenge) {
      try {
        await challengeRepo.cancelChallenge(
          lease.challenge.challenge_id,
          releasedChallenge.state_version,
          "ACTIVE"
        );
        return clearRegistrationChallengeCookie(
          handleRegistrationRouteError(error)
        );
      } catch {
        return handleRegistrationRouteError(
          new RegistrationError(
            "Registration cleanup could not be completed. Please try again.",
            "PROVISIONING_FAILED",
            503
          )
        );
      }
    }

    return handleRegistrationRouteError(error);
  }
}
