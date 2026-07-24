// src/app/api/vos-admin/audit-trail/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { fetchAuditConfigRepo, updateAuditConfigRepo, AuditCategoryConfig } from "@/modules/vos-admin/audit-trail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function verifyAdminRole(req: NextRequest): Promise<{ adminId: number; roleId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1, roleId: 3 };
  }
  const cookieStore = await cookies();
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id);
    const roleId = Number(payload.role_id ?? payload.role ?? 0);
    return { adminId, roleId };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await fetchAuditConfigRepo();
    return NextResponse.json({ config });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.roleId !== 3 && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const newConfig: AuditCategoryConfig = body.config;

    if (!newConfig || typeof newConfig !== "object") {
      return NextResponse.json({ error: "Invalid config object" }, { status: 400 });
    }

    const savedConfig = await updateAuditConfigRepo(newConfig, auth.adminId);
    return NextResponse.json({ config: savedConfig, message: "Audit settings updated successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
