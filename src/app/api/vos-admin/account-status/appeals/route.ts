// src/app/api/vos-admin/account-status/appeals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { resolveAppeal } from "@/modules/vos-admin/account-status-management";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function verifyAdmin(req: NextRequest): Promise<{ adminId: number; email: string } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1, email: "admin@localhost" };
  }
  const cookieStore = await cookies();
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      adminId: Number(payload.sub || payload.user_id || payload.id),
      email: (payload.user_email as string) || "admin@example.com"
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { caseId, userId, decision, internalNote, publicNote } = body;

    if (!caseId || !userId || !decision) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (decision !== 'uphold' && decision !== 'modify' && decision !== 'restore') {
      return NextResponse.json({ error: "Invalid decision value" }, { status: 400 });
    }

    const success = await resolveAppeal(
      Number(caseId),
      Number(userId),
      decision,
      admin.email,
      internalNote,
      publicNote
    );

    if (success) {
      // Create Audit record
      createAuditRecordRepo({
        event_type: "APPEAL_DECISION_SUBMITTED",
        event_category: "USER",
        action: "UPDATE",
        status: "SUCCESS",
        actor_type: "ADMIN",
        actor_user_id: admin.adminId,
        resource_type: "account_status_case",
        resource_id: String(caseId),
        reason: internalNote || `Appeal case #${caseId} resolved with decision: ${decision}`,
      });
    }

    return NextResponse.json({ success });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
