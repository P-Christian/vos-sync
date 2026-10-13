import { NextRequest, NextResponse } from "next/server";
import { getMySchool, updateMySchool } from "@/modules/school-admin/services/school-admin.service";
import { checkRestriction } from "@/lib/status-validator";
import { authenticateCookieSession } from "@/lib/authenticated-session";

async function getUserIdFromToken() {
  const session = await authenticateCookieSession();
  return session ? Number(session.userId) : null;
}

export async function GET() {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    return NextResponse.json({ school });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Validate UPDATE_SCHOOL Restriction
    const isRestricted = await checkRestriction(userId, "UPDATE_SCHOOL");
    if (isRestricted) {
      return NextResponse.json(
        { error: "Your school modification privileges are temporarily suspended." },
        { status: 403 }
      );
    }

    const school = await getMySchool(userId);
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const body = await req.json();
    
    // In a real implementation, we would use zod for validation here.
    // For MVP, we pass the body to the service.
    const updated = await updateMySchool(school.school_id, body, userId);

    return NextResponse.json({ school: updated });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
