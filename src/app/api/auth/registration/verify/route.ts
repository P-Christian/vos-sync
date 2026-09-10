import { NextRequest } from "next/server";
import {
  getChallengeId,
  handleRegistrationRouteError,
  parseRegistrationJson,
  registrationJson,
  requireRegistrationV2,
  verifyOtpInputSchema,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const disabled = requireRegistrationV2();
  if (disabled) return disabled;

  try {
    getChallengeId(request);
    await parseRegistrationJson(request, verifyOtpInputSchema);

    // Phase 4 owns OTP verification plus idempotent graph provisioning. Do
    // not acquire a verification lease until that transaction can complete.
    return registrationJson(
      {
        ok: false,
        code: "PROVISIONING_FAILED",
        message: "Registration verification is not available yet.",
      },
      503
    );
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
