import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";
import {
  CourseRequestDecisionError,
  getCourseRequests,
} from "@/modules/vos-admin/request-management";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";

    const requests = await getCourseRequests(status);
    return NextResponse.json({ requests });
  } catch (error: unknown) {
    if (error instanceof CourseRequestDecisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Course request storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
