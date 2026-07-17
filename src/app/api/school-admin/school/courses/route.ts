import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getMySchool, getMyCourses, createMyCourse } from "@/modules/school-admin/services/school-admin.service";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_key_for_development");

async function getUserIdFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return Number(payload.sub || payload.user_id || payload.id);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const courses = await getMyCourses(school.school_id);
    return NextResponse.json({ courses });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const body = await req.json();
    const created = await createMyCourse(school.school_id, body, userId);

    return NextResponse.json({ course: created }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
