import { NextResponse } from "next/server";
import { getMySchool } from "@/modules/school-admin/services/school-admin.service";
import { authenticateCookieSession } from "@/lib/authenticated-session";

async function getUserIdFromToken() {
  const session = await authenticateCookieSession();
  return session ? Number(session.userId) : null;
}

export async function GET() {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await getMySchool(userId);
    if (!school) {
      return NextResponse.json({ error: "School not found or assigned." }, { status: 404 });
    }

    return NextResponse.json({ school });
  } catch (error: unknown) {
    console.error("GET /api/school-admin/me error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
