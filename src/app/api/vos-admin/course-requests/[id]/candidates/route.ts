import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";
import {
  CourseRequestDecisionError,
  getCourseRequestCandidates,
} from "@/modules/vos-admin/request-management";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRole(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing token" },
        { status: 401 }
      );
    }

    // Role restriction: VOS Admin only
    if (
      auth.roleId !== 3 &&
      process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to administrators" },
        { status: 403 }
      );
    }

    const { id: paramId } = await params;
    const id = parseInt(paramId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Candidates come from the request's persisted school. Query parameters
    // are never consulted, so no school override is possible.
    const result = await getCourseRequestCandidates(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof CourseRequestDecisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Course catalog storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
