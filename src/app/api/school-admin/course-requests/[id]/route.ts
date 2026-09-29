import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { approveCourseRequest, rejectCourseRequest } from "@/modules/school-admin/course-requests";
import {
  decisionSchema,
  parsePositiveId,
  requireSchoolAdminSession,
  toErrorResponse,
} from "../_http";

/**
 * PATCH /api/school-admin/course-requests/{id}
 *
 * Role-authorized, exactly-scoped decision endpoint. Authorization (SCHOOL_ADMIN
 * + exactly one active assignment) runs BEFORE any lookup. The body is the
 * strict closed-world discriminated union: `{ action: "approve",
 * matched_school_course_id }` or `{ action: "reject", remarks }`. Forged
 * school/requester/reviewer/education/status/course/roster/academics keys are
 * rejected as 400. Approval and rejection delegate to the durable decision saga
 * with camelCase inputs; exact terminal Approved/Rejected replay converges
 * inside the service. The response is exactly `{ result: {...} }`.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await requireSchoolAdminSession(req);
    const { id } = await params;
    const requestId = parsePositiveId(id);
    const body: unknown = await req.json();
    const decision = decisionSchema.parse(body);
    const ctx = { userId: session.userId, schoolId: session.schoolId };

    if (decision.action === "reject") {
      const result = await rejectCourseRequest(ctx, { requestId, remarks: decision.remarks });
      return NextResponse.json({ result });
    }

    const result = await approveCourseRequest(ctx, {
      requestId,
      courseId: decision.matched_school_course_id,
    });
    return NextResponse.json({ result });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
