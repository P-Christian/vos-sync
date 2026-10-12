import { NextRequest, NextResponse } from "next/server";
import { getUserList, getUserDetail } from "@/modules/vos-admin/user-management";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session || !isAdministratorSession(session)) {
      return NextResponse.json(
        { error: session ? "Forbidden: Admin access required" : "Unauthorized" },
        { status: session ? 403 : 401 }
      );
    }

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
