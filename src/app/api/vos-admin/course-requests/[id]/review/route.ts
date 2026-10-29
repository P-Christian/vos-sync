import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAdministratorSession } from "@/lib/authenticated-session";
import { ZodError } from "zod";
import {
  CourseRequestDecisionError,
  reviewCourseRequest,
  reviewCourseRequestSchema,
} from "@/modules/vos-admin/request-management";
import { EducationFlowUnavailableError } from "@/modules/education-verification";

export async function PATCH(
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

    const body = await req.json();
    const parsed = reviewCourseRequestSchema.parse(body);

    const request = await reviewCourseRequest(id, parsed, adminId, {
      roleId: roleId,
    });
    return NextResponse.json({ request });
  } catch (error: unknown) {
    if (error instanceof EducationFlowUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }
    if (error instanceof CourseRequestDecisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      const [firstIssue] = error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Malformed decision body." },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Malformed decision body." },
        { status: 400 }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Course request storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
