import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getCourseRequests, createCourseRequest, createCourseRequestSchema } from "@/modules/vos-admin/request-management";

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

export async function GET(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req);
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";

    const requests = await getCourseRequests(status);
    return NextResponse.json({ requests });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req);
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createCourseRequestSchema.parse(body);

    const request = await createCourseRequest(parsed, adminId);
    return NextResponse.json({ request }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
