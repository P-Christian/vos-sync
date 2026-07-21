import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getMySchool, updateMyCourse } from "@/modules/school-admin/services/school-admin.service";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const courseId = parseInt(resolvedParams.courseId, 10);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const body = await req.json();
    
    // Note: In a stricter implementation, we should also verify that this courseId belongs to the schoolId
    // to prevent modifying courses of other schools. We'll pass it to the service for now.
    const updated = await updateMyCourse(courseId, body, userId);

    return NextResponse.json({ course: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
