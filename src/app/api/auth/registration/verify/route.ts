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
  issueRegistrationSession,
} from "@/modules/auth/registration/registration.session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    lease = await new RegistrationService(
      challengeRepo
    ).verifyOtpAndAcquireLease(
      challengeId,
      input.otp,
      input.sealedPayload
    );

    const user = await new RegistrationProvisioningService().provision(
      lease.challenge,
      lease.payload
    );
    await challengeRepo.consumeChallenge(
      challengeId,
      lease.challenge.state_version,
      lease.leaseId
    );

    const session = await issueRegistrationSession(user);
    let response = registrationJson({
      ok: true,
      role: lease.payload.role,
      destination: session.destination,
    });
    // Clear the narrow challenge cookie first and write the root auth cookie
    // last. This is robust to development proxies that incorrectly retain
    // only the final Set-Cookie header from a multi-cookie response.
    response = clearRegistrationChallengeCookie(response);
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

    if (terminalCompanyConflict && lease && releasedChallenge) {
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
