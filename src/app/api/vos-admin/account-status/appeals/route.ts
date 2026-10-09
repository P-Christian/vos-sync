// src/app/api/vos-admin/account-status/appeals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveAppeal } from "@/modules/vos-admin/account-status-management";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session || !isAdministratorSession(session)) {
      return NextResponse.json(
        { error: session ? "Forbidden: Admin access required" : "Unauthorized" },
        { status: session ? 403 : 401 }
      );
    }

    const admin = {
      adminId: Number(session.userId),
      email: (session.payload.user_email as string) || "admin@vosync.com",
    };

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
