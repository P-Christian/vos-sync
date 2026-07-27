// src/app/api/vos-admin/account-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getAccountStatusUsers, getAccountStatusDetail, changeUserStatus } from "@/modules/vos-admin/account-status-management";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";
import { cookies } from "next/headers";

import { createNotification } from "@/lib/notifications";

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

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("userId");

    if (userIdStr) {
      const user = await getAccountStatusDetail(Number(userIdStr));
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json({ user });
    }

    const statusFilter = searchParams.get("statusFilter") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 10;

    const result = await getAccountStatusUsers(statusFilter, search, page, limit);
    return NextResponse.json({ users: result.users, total: result.total });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { userId, targetStatus, reasonCode, publicReason, internalNote, expiresAt, restrictions } = body;

    if (!userId || !targetStatus || !reasonCode || !publicReason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch user details first to get current version
    const userDetail = await getAccountStatusDetail(Number(userId));
    if (!userDetail) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newVersion = userDetail.status_version + 1;

    const success = await changeUserStatus(
      Number(userId),
      targetStatus,
      newVersion,
      admin.email,
      reasonCode,
      publicReason,
      internalNote,
      expiresAt,
      restrictions
    );

    if (success) {
      // Create Audit record
      createAuditRecordRepo({
        event_type: "ACCOUNT_STATUS_UPDATED",
        event_category: "USER",
        action: "UPDATE",
        status: "SUCCESS",
        actor_type: "ADMIN",
        actor_user_id: admin.adminId,
        resource_type: "vs_user",
        resource_id: String(userId),
        reason: internalNote || `${targetStatus} status applied for reason ${reasonCode}`,
      });

      // Send User/Freelancer Notification
      try {
        const actionUrl = targetStatus === "SUSPENDED" || targetStatus === "BLOCKED"
          ? "/vos-sync/suspended"
          : (userDetail.role === "CLIENT" ? "/vos-sync/client/dashboard" : "/vos-sync/freelancer/dashboard");

        await createNotification({
          event_type: "account_status_change",
          recipient_user_id: Number(userId),
          entity_type: "user",
          entity_id: Number(userId),
          category: "System Activity",
          title: `Account Status Changed to ${targetStatus.replace("_", " ")}`,
          message: publicReason,
          action_url: actionUrl,
        });
      } catch (notifErr) {
        console.error("Failed to create user status change notification:", notifErr);
      }
    }

    return NextResponse.json({ success });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
