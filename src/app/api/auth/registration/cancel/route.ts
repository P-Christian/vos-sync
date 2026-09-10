import { NextRequest } from "next/server";
import {
  clearRegistrationChallengeCookie,
  getChallengeId,
  handleRegistrationRouteError,
  registrationJson,
  RegistrationService,
  requireRegistrationV2,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  try {
    const result = await new RegistrationService().cancelRegistration(
      getChallengeId(request)
    );
    return clearRegistrationChallengeCookie(registrationJson(result));
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
