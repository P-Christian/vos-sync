// src/app/api/vos-admin/school-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  getSchoolVerifications,
  processVerificationDecision,
  VerificationDecisionSchema,
} from "@/modules/vos-admin/school-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function getAdminUserFromToken(req: NextRequest): Promise<{ adminId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1 };
  }
  const cookieStore = await cookies();
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    cookieStore.get("vos_access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id || 1);
    return { adminId };
  } catch {
    return { adminId: 1 };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized: no token provided" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const records = await getSchoolVerifications(status, search);
    return NextResponse.json(records);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("API Route Error (GET school-verification):", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAdminUserFromToken(req);
    const adminId = auth?.adminId || 1;

    const body = await req.json();
    const parseResult = VerificationDecisionSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: `Validation error: ${errorMsg}` }, { status: 400 });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await processVerificationDecision(parseResult.data, adminId, clientIp, userAgent);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("API Route Error (POST school-verification):", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
