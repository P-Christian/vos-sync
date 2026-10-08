// POST freelancer assessment proof upload (multipart: job_task_id + file).
// Writes proof_file_id/proof_file_name onto the editable response only.

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isFreelancerSession } from "@/lib/authenticated-session";
import {
  loadOwnedApplication,
  resolveAssessmentContext,
} from "@/modules/freelancer/freelancer-applications/services/assessment/context";
import { uploadProofFile } from "@/modules/freelancer/freelancer-applications/services/assessment/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const formData = await req.formData().catch(() => null);
    if (!formData) return errorResponse("A multipart form with a file is required.", 400);

    const result = await uploadProofFile(context, formData);
    if (!result.ok) return errorResponse(result.error, result.status);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[freelancer-assessment] upload error:", error);
    return errorResponse("File upload could not be completed.", 502);
  }
}
