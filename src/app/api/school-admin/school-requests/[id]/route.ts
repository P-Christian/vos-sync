import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  approveSchoolAttendance,
  rejectSchoolAttendance,
} from "@/modules/school-admin/school-requests";
import { fetchSchoolRequest } from "@/modules/school-request-routing";
import {
  decisionSchema,
  normalizeAcademics,
  parsePositiveId,
  requireSchoolAdminSession,
  toErrorResponse,
  type SchoolAdminSession,
} from "../_http";

type RejectReplayResult = {
  readonly requestId: number;
  readonly requestStatus: "Rejected";
  readonly reviewedBy: number;
  readonly reviewedAt: string;
};

/**
 * Exact rejection replay convergence. The rejection service already
 * implements this, but the school-scoped fetch deliberately refuses terminal
 * (Rejected) rows, so the replay branch is unreachable through the service.
 * This read-only shim detects only an identical, own-school, same-reviewer
 * rejection and echoes the persisted claim; every other case delegates so the
 * service owns conflict/not-found reporting. A foreign or absent id returns
 * null (no disclosure).
 */
async function convergeRejectReplay(
  session: SchoolAdminSession,
  requestId: number,
  remarks: string,
): Promise<RejectReplayResult | null> {
  try {
    const current = await fetchSchoolRequest(requestId);
    if (
      current.matched_school_id !== session.schoolId ||
      current.request_status !== "Rejected" ||
      current.reviewed_by !== session.userId ||
      current.admin_remarks !== remarks
    ) {
      return null;
    }
    return {
      requestId,
      requestStatus: "Rejected",
      reviewedBy: session.userId,
      reviewedAt: current.reviewed_at ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * PATCH /api/school-admin/school-requests/{id}
 *
 * Role-authorized, exactly-scoped decision endpoint. Authorization (SCHOOL_ADMIN
 * + exactly one active assignment) runs BEFORE any lookup. The body is a strict
 * closed-world discriminated union: `{ action: "approve", student_number?, gpa?,
 * school_year? }` or `{ action: "reject", remarks }`. Forged school/requester/
 * education/course/is_alumni keys are rejected as 400. Approval delegates to the
 * claim-first attendance workflow (academics are written once to the roster row);
 * rejection requires trimmed nonblank remarks and uses the guarded rejection path.
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

    if (decision.action === "reject") {
      const replay = await convergeRejectReplay(session, requestId, decision.remarks);
      if (replay !== null) return NextResponse.json({ result: replay });
      const result = await rejectSchoolAttendance({
        callerUserId: session.userId,
        requestId,
        remarks: decision.remarks,
      });
      return NextResponse.json({ result });
    }

    const academics = normalizeAcademics(decision);
    const result = await approveSchoolAttendance({
      callerUserId: session.userId,
      requestId,
      academics,
    });
    return NextResponse.json({ result });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
