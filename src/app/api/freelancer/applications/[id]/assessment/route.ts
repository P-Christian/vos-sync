// GET freelancer assessment: frozen tasks + latest attempt + responses.
// Strictly read-only: never creates an attempt or writes anything.

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isFreelancerSession } from "@/lib/authenticated-session";
import {
  loadOwnedApplication,
  resolveAssessmentContext,
} from "@/modules/freelancer/freelancer-applications/services/assessment/context";
import { resolveAssessmentDeadline } from "@/modules/freelancer/freelancer-applications/services/assessment/deadline";
import { readAssessment } from "@/modules/freelancer/freelancer-applications/services/assessment/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authenticateRequest(req);
  if (!session) return errorResponse("Unauthorized.", 401);
  if (!isFreelancerSession(session)) return errorResponse("Freelancer account required.", 403);

  const { id } = await params;
  const applicationId = Number(id);
  if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
    return errorResponse("Application not found.", 404);
  }

  try {
    const application = await loadOwnedApplication(applicationId, session.userId);
    if (!application) return errorResponse("Application not found.", 404);

    const context = await resolveAssessmentContext(application);
    if (context.kind === "empty") {
      return NextResponse.json(
        {
          application_id: application.application_id,
          stage_id: application.current_stage_id,
          status: "NOT_STARTED",
          attempt: null,
          tasks: [],
          responses: [],
          deadline: null,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const view = await readAssessment(context);
    const deadline = await resolveAssessmentDeadline(
      application.application_id,
      context.stageId,
    );
    return NextResponse.json({ ...view, deadline }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[freelancer-assessment] read error:", error);
    return errorResponse("Assessment could not be loaded.", 502);
  }
}
