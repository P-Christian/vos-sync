import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSchoolRequestInbox } from "@/modules/school-admin/school-requests";
import { requireSchoolAdminSession, toErrorResponse } from "./_http";
import { attachSubmitterNames } from "./_submitter";

/**
 * GET /api/school-admin/school-requests
 *
 * Role-authorized, exactly-scoped School Admin inbox. The SCHOOL_ADMIN role
 * and the exact-one active assignment are resolved server-side BEFORE any
 * request query. Returns only the privacy-limited DTO for the caller's own
 * school: actionable `RoutedToSchool` decisions plus recoverable
 * `Approved`-finalizing rows. No other school's existence is disclosed and no
 * requester identity/academics beyond the DTO is exposed.
 *
 * The name-only `submitterName` label is attached here at the route boundary,
 * keeping the domain module identity-free: the
 * closed-world row schema strips unknown keys, and the resolved label is
 * spread in only after that parse has already succeeded.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSchoolAdminSession(req);
    const inbox = await listSchoolRequestInbox(session.userId);
    return NextResponse.json({ inbox: await attachSubmitterNames(inbox) });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
