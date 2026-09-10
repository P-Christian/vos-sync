import { NextRequest } from "next/server";
import { extractClientIp } from "@/lib/auth-utils";
import {
  handleRegistrationRouteError,
  parseRegistrationJson,
  registrationInputUnionSchema,
  registrationJson,
  RegistrationService,
  requireRegistrationV2,
  setRegistrationChallengeCookie,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  try {
    const input = await parseRegistrationJson(
      request,
      registrationInputUnionSchema
    );
    const { challengeId, ...responseBody } =
      await new RegistrationService().initiateRegistration(
        input,
        extractClientIp(request.headers) ?? undefined
      );
    return setRegistrationChallengeCookie(
      registrationJson(responseBody),
      challengeId
    );
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
