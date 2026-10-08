// PUT freelancer assessment draft: validates and upserts per-task responses.
// Creates attempt 1 when none exists; requires IN_PROGRESS otherwise.

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isFreelancerSession } from "@/lib/authenticated-session";
import {
  loadOwnedApplication,
  resolveAssessmentContext,
} from "@/modules/freelancer/freelancer-applications/services/assessment/context";
import { saveDraftResponses } from "@/modules/freelancer/freelancer-applications/services/assessment/draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return errorResponse("No assessment is available for this application stage.", 409);
    }

    const body: unknown = await req.json().catch(() => null);
    const result = await saveDraftResponses(context, body);
    if (!result.ok) {
      if (result.issues) {
        return NextResponse.json(
          { error: result.error, issues: result.issues },
          { status: result.status, headers: { "Cache-Control": "no-store" } },
        );
      }
      return errorResponse(result.error, result.status);
    }
    return NextResponse.json(
      { attempt: result.attempt, saved: result.saved },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[freelancer-assessment] draft error:", error);
    return errorResponse("Draft could not be saved.", 502);
  }
}
