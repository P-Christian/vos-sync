import { NextRequest, NextResponse } from "next/server";
import { transitionApplicationStage } from "@/modules/client/pipeline/services/job-pipeline.service";
import { createNotification } from "@/lib/notifications";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { authenticateRequest } from "@/lib/authenticated-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

async function getCompanyId(userId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    return json.data?.[0]?.company_id ?? null;
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = Number(id);
    if (!applicationId || isNaN(applicationId)) {
      return NextResponse.json({ error: "Invalid application ID." }, { status: 400 });
    }

    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = Number(session.userId);
    const companyId = await getCompanyId(userId);
    if (!companyId) {
      return NextResponse.json({ error: "Company association not found." }, { status: 403 });
    }

    // IDOR Protection: Verify application belongs to a job owned by this company
    const appCheckRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application/${applicationId}?fields=application_id,job_id`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!appCheckRes.ok) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    const appCheckJson = await appCheckRes.json();
    const targetJobId = Number(appCheckJson.data?.job_id);
    if (!targetJobId) {
      return NextResponse.json({ error: "Application is not associated with a valid job." }, { status: 400 });
    }

    const jobCheckRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting/${targetJobId}?fields=job_id,company_id`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!jobCheckRes.ok) {
      return NextResponse.json({ error: "Associated job posting not found." }, { status: 404 });
    }
    const jobCheckJson = await jobCheckRes.json();
    const jobCompanyId = Number(jobCheckJson.data?.company_id);
    if (jobCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Forbidden: Candidate application belongs to another organization." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const toStageId = body?.to_stage_id ? Number(body.to_stage_id) : null;

    if (!toStageId || isNaN(toStageId)) {
      return NextResponse.json(
        { error: "to_stage_id is required and must be a valid number." },
        { status: 400 }
      );
    }

    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 1000) : undefined;

    const result = await transitionApplicationStage({
      applicationId,
      toStageId,
      changedByUserId: userId,
      changeReason: notes,
      notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to transition candidate stage." },
        { status: result.statusCode || 422 }
      );
    }

    // Dispatch background notifications if moved to a new stage
    if (!result.noop && result.toStage && result.application) {
      const appData = result.application as Record<string, unknown>;
      const jobseekerId = appData.user_id ? Number(appData.user_id) : null;
      const jobId = appData.job_id ? Number(appData.job_id) : null;

      // Fetch job title for clean notification
      let jobTitle = "Job Posting";
      if (jobId) {
        try {
          const jRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${jobId}?fields=job_title`, {
            headers: getHeaders(),
            cache: "no-store",
          });
          if (jRes.ok) {
            const jJson = await jRes.json();
            jobTitle = jJson.data?.job_title || jobTitle;
          }
        } catch {}
      }

      if (jobseekerId) {
        createNotification({
          event_type: "application_status_changed",
          recipient_user_id: jobseekerId,
          entity_type: "job_application",
          entity_id: applicationId,
          category: "APPLICATION_STATUS_UPDATED",
          title: `Application Moved to ${result.toStage.stage_name}`,
          message: `Your application for "${jobTitle}" has progressed to "${result.toStage.stage_name}".`,
          action_url: "/vos-sync/freelancer/applications",
        }).catch((err) => console.error("[Candidate Stage Notification] Error:", err));

        // System message inside conversation if available
        const systemText =
          result.toStage.stage_type === "HIRED"
            ? "Client hired you."
            : `Application moved to stage: ${result.toStage.stage_name}`;

        const statusEventType =
          result.toStage.stage_type === "HIRED" ? "HIRED" : "APPLICATION_STATUS_CHANGED";

        createSystemMessage({
          clientId: userId,
          freelancerId: jobseekerId,
          jobId: jobId,
          text: systemText,
          senderId: userId,
          systemEventType: statusEventType,
          applicationId: applicationId,
        }).catch((e) => console.error("[Stage System Message] Error:", e));
      }
    }

    return NextResponse.json({
      success: true,
      message: result.noop
        ? `Application is already in "${result.toStage?.stage_name}".`
        : `Application moved to "${result.toStage?.stage_name}".`,
      application: result.application,
      from_stage: result.fromStage,
      to_stage: result.toStage,
      noop: result.noop ?? false,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/client/applicants/[id]/stage error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
