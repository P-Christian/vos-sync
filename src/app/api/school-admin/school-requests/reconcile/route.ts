import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { recoverSchoolAttendance } from "@/modules/school-admin/school-requests";
import { requireSchoolAdminSession, toErrorResponse } from "../_http";

/**
 * POST /api/school-admin/school-requests/reconcile
 *
 * Idempotent resume/reconcile for the caller's own-school Approved-finalizing
 * rows (Approved + linked education still unresolved + no linked course
 * request). Authorization runs before any lookup. No client input is consumed:
 * the persisted claim (reviewer/time) and roster-held academics drive every
 * repair. Repeating the call after convergence returns an empty `recovered`
 * set with no additional mutation.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSchoolAdminSession(req);
    const recovered = await recoverSchoolAttendance(session.userId);
    return NextResponse.json({ recovered, count: recovered.length });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
