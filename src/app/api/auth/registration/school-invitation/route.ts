import { NextRequest } from "next/server";
import {
  getSchoolInvitation,
  handleRegistrationRouteError,
  parseDirectusUtcDateTime,
  registrationJson,
} from "@/modules/auth/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INVITATION_TOKEN_LENGTH = 4_096;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (!token || token.length > MAX_INVITATION_TOKEN_LENGTH) {
      return registrationJson(
        { ok: true, valid: false, reason: "invalid" },
        400
      );
    }

    const invitation = await getSchoolInvitation(token);
    if (!invitation) {
      return registrationJson(
        { ok: true, valid: false, reason: "not_found" },
        404
      );
    }
    if (invitation.is_used) {
      return registrationJson({ ok: true, valid: false, reason: "used" });
    }

    const expiresAt = parseDirectusUtcDateTime(invitation.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return registrationJson({ ok: true, valid: false, reason: "expired" });
    }

    const school = invitation.school_id;
    return registrationJson({
      ok: true,
      valid: true,
      invitedEmail: invitation.invited_email,
      schoolId: typeof school === "object" ? school.school_id : school,
      schoolName: typeof school === "object" ? school.school_name : undefined,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    return handleRegistrationRouteError(error);
  }
}
