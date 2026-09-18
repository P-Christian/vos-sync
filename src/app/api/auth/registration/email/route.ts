import { NextRequest } from "next/server";
import { extractClientIp } from "@/lib/auth-utils";
import {
  emailCorrectionInputSchema,
  getChallengeId,
  handleRegistrationRouteError,
  parseRegistrationJson,
  registrationJson,
  RegistrationService,
  requireRegistrationV2,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  try {
    const input = await parseRegistrationJson(
      request,
      emailCorrectionInputSchema
    );
    const turnstileToken =
      input.turnstileToken ?? input["cf-turnstile-response"];
    const result = await new RegistrationService().correctEmail(
      getChallengeId(request),
      input.sealedPayload,
      input.newEmail,
      turnstileToken,
      extractClientIp(request.headers) ?? undefined
    );
    return registrationJson(result);
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
