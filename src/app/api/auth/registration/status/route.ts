import { NextRequest } from "next/server";
import {
  getChallengeId,
  handleRegistrationRouteError,
  registrationJson,
  RegistrationService,
  requireRegistrationV2,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  try {
    const status = await new RegistrationService().getChallengeStatus(
      getChallengeId(request)
    );
    return registrationJson(status);
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
