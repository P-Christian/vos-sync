import { NextRequest } from "next/server";
import {
  getChallengeId,
  handleRegistrationRouteError,
  parseRegistrationJson,
  registrationJson,
  RegistrationService,
  requireRegistrationV2,
  resendOtpInputSchema,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  try {
    const input = await parseRegistrationJson(request, resendOtpInputSchema);
    const result = await new RegistrationService().resendOtp(
      getChallengeId(request),
      input.sealedPayload
    );
    return registrationJson(result);
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
