import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getUserList, getUserDetail } from "@/modules/vos-admin/user-management";
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
    const userIdStr = searchParams.get("userId");

    if (userIdStr) {
      const user = await getUserDetail(Number(userIdStr));
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json({ user });
    }

    const roleId = searchParams.get("roleId") ? Number(searchParams.get("roleId")) : undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 10;

    const result = await getUserList(roleId, search, page, limit);
    return NextResponse.json({ users: result.users, total: result.total });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
