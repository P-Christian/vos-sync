import { NextRequest } from "next/server";
import { COOKIE_NAME, getCookieOptions } from "@/lib/auth-utils";
import {
  clearRegistrationChallengeCookie,
  getChallengeId,
  handleRegistrationRouteError,
  parseRegistrationJson,
  RegistrationChallengeRepository,
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
    const response = registrationJson({
      ok: true,
      role: lease.payload.role,
      destination: session.destination,
    });
    response.cookies.set({
      name: COOKIE_NAME,
      value: session.token,
      ...getCookieOptions(true),
    });
    return clearRegistrationChallengeCookie(response);
  } catch (error) {
    if (lease) {
      try {
        await challengeRepo.releaseVerificationLease(
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
    return handleRegistrationRouteError(error);
  }
}
