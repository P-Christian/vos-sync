import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { reviewIdentityDocument } from "@/modules/vos-admin/user-management";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function verifyAdmin(req: NextRequest): Promise<number | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return 1;
  const cookieStore = await cookies();
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return Number(payload.sub || payload.user_id || payload.id);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req);
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { verificationId, status, rejectionNote } = body;

    if (!verificationId || !status) {
      return NextResponse.json({ error: "Missing verificationId or status" }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const verification = await reviewIdentityDocument(
      Number(verificationId),
      status,
      adminId,
      rejectionNote
    );

    createAuditRecordRepo({
      event_type: status === 'approved' ? "IDENTITY_VERIFICATION_APPROVED" : "IDENTITY_VERIFICATION_REJECTED",
      event_category: "USER",
      action: status === 'approved' ? "VERIFY" : "REJECT",
      status: "SUCCESS",
      actor_type: "ADMIN",
      actor_user_id: adminId,
      resource_type: "vs_identity_verifications",
      resource_id: String(verificationId),
      reason: rejectionNote || `Identity document ${status} by admin #${adminId}`,
    });

    return NextResponse.json({ verification });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
