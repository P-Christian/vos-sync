// src/app/api/auth/google/unlink/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { getUserById } from "@/modules/auth/services/auth.repo";
import { unlinkUserIdentity } from "@/modules/auth/google/google.service";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Mandatory server-side password check to prevent account lockout
    const user = await getUserById(session.userId);
    const storedHash = user?.hash_password || user?.user_password;
    const hasPassword = Boolean(storedHash && String(storedHash).trim() !== "");

    if (!hasPassword) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please set an account password before disconnecting Google to ensure you can still sign in.",
        },
        { status: 400 }
      );
    }

    // 2. Remove Google federated identity association
    const removed = await unlinkUserIdentity(session.userId, "google");

    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "No linked Google account found to disconnect." },
        { status: 404 }
      );
    }

    // 3. Record audit trail
    createAuditRecordRepo({
      event_type: "USER_IDENTITY_UNLINKED",
      event_category: "AUTHENTICATION",
      action: "UNLINK_IDENTITY",
      status: "SUCCESS",
      actor_type: session.roleId === 3 ? "ADMIN" : "USER",
      actor_user_id: Number(session.userId),
      reason: "User disconnected linked Google identity",
    });

    return NextResponse.json({
      ok: true,
      message: "Google account disconnected successfully.",
    });
  } catch (error: unknown) {
    console.error("[POST /api/auth/google/unlink] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to disconnect Google account." },
      { status: 500 }
    );
  }
}
