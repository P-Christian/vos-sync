import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getMySchool, updateMySchool } from "@/modules/school-admin/services/school-admin.service";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_key_for_development");

async function getUserIdFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return Number(payload.sub || payload.user_id || payload.id);
  } catch (err) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    return NextResponse.json({ school });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const body = await req.json();
    
    // In a real implementation, we would use zod for validation here.
    // For MVP, we pass the body to the service.
    const updated = await updateMySchool(school.school_id, body, userId);

    return NextResponse.json({ school: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
