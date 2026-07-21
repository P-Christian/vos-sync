// src/app/api/client/interviews/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendHiringEmail, sendRejectionEmail, sendInterviewRescheduledEmail } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id != null ? Number(id) : null;
  } catch { return null; }
}

// ─── PATCH — Update interview status, details, evaluation ratings, or cancel ──

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id, 10);

    if (!interviewId || isNaN(interviewId)) {
      return NextResponse.json({ error: "Invalid interview ID." }, { status: 400 });
    }

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const type = body?.type;
    const payload = body?.payload;

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    if (type === "DETAILS") {
      const updateData: Record<string, unknown> = {
        updated_by_user_id: userId,
        updated_at: nowPH,
      };

      if (payload?.interview_status) updateData.interview_status = payload.interview_status;
      if (payload?.scheduled_at) updateData.scheduled_at = payload.scheduled_at;
      if (payload?.duration_minutes) updateData.duration_minutes = payload.duration_minutes;
      if (payload?.timezone) updateData.timezone = payload.timezone;
      if (payload?.interview_format) updateData.interview_format = payload.interview_format;
      if (payload?.meeting_link !== undefined) updateData.meeting_link = payload.meeting_link;
      if (payload?.meeting_location !== undefined) updateData.meeting_location = payload.meeting_location;
      if (payload?.interview_notes !== undefined) updateData.interview_notes = payload.interview_notes;
      if (payload?.candidate_notes !== undefined) updateData.candidate_notes = payload.candidate_notes;
      if (payload?.cancel_reason !== undefined) updateData.cancel_reason = payload.cancel_reason;

      const res = await fetch(`${DIRECTUS_BASE}/items/vs_interview/${interviewId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Directus patch interview error:", text);
        return NextResponse.json(
          { error: "Failed to update interview details." },
          { status: res.status }
        );
      }

      if (payload?.interview_status === "RESCHEDULED") {
        try {
          const updatedIvRes = await fetch(
            `${DIRECTUS_BASE}/items/vs_interview/${interviewId}?fields=*`,
            { headers: getHeaders(), cache: "no-store" }
          );
          if (updatedIvRes.ok) {
            const ivData = (await updatedIvRes.json()).data;
            if (ivData?.application_id) {
              const appRes = await fetch(
                `${DIRECTUS_BASE}/items/vs_job_application/${ivData.application_id}?fields=user_id,job_id`,
                { headers: getHeaders(), cache: "no-store" }
              );
              if (appRes.ok) {
                const appData = (await appRes.json()).data;
                const candidateUserId = appData?.user_id;

                if (candidateUserId) {
                  const userRes = await fetch(
                    `${DIRECTUS_BASE}/items/vs_user/${candidateUserId}?fields=user_email,user_fname,user_lname`,
                    { headers: getHeaders(), cache: "no-store" }
                  );
                  if (userRes.ok) {
                    const candidate = (await userRes.json()).data;

                    if (candidate?.user_email) {
                      let jobTitle = "Unknown Role";
                      let companyName = "Employer";

                      if (appData.job_id) {
                        const jobRes = await fetch(
                          `${DIRECTUS_BASE}/items/vs_job_posting/${appData.job_id}?fields=job_title,company_id`,
                          { headers: getHeaders(), cache: "no-store" }
                        );
                        if (jobRes.ok) {
                          const jobData = (await jobRes.json()).data;
                          if (jobData?.job_title) jobTitle = jobData.job_title;
                          if (jobData?.company_id) {
                            const compRes = await fetch(
                              `${DIRECTUS_BASE}/items/vs_company/${jobData.company_id}?fields=company_name`,
                              { headers: getHeaders(), cache: "no-store" }
                            );
                            if (compRes.ok) {
                              companyName = (await compRes.json()).data?.company_name || companyName;
                            }
                          }
                        }
                      }

                      await sendInterviewRescheduledEmail(candidate.user_email, {
                        candidateName: `${candidate.user_fname} ${candidate.user_lname}`.trim(),
                        companyName,
                        jobTitle,
                        scheduledAt: ivData.scheduled_at,
                        timezone: ivData.timezone || "Asia/Manila",
                        durationMinutes: ivData.duration_minutes || 60,
                        interviewFormat: ivData.interview_format || "ONLINE",
                        meetingLink: ivData.meeting_link || null,
                        meetingLocation: ivData.meeting_location || null,
                        candidateNotes: ivData.candidate_notes || null,
                      }).catch((e) => console.error("Error sending reschedule email:", e));

                      await createSystemMessage({
                        clientId: userId,
                        freelancerId: candidateUserId,
                        jobId: appData.job_id ?? null,
                        text: `Interview rescheduled for ${ivData.scheduled_at}.`,
                        senderId: userId,
                      }).catch((e) => console.error("Error sending reschedule system message:", e));

                      await createNotification({
                        event_type: "interview_rescheduled",
                        recipient_user_id: candidateUserId,
                        entity_type: "vs_interview",
                        entity_id: interviewId,
                        category: "INTERVIEW",
                        title: "Interview Rescheduled",
                        message: `Your interview with ${companyName} has been rescheduled to ${ivData.scheduled_at}.`,
                        action_url: "/vos-sync/freelancer/applications",
                      }).catch((e) => console.error("Error sending reschedule notification:", e));
                    }
                  }
                }
              }
            }
          }
        } catch (rescheduleErr) {
          console.error("Error during reschedule notification pipeline:", rescheduleErr);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (type === "EVALUATION") {
      const score = Number(payload?.evaluation_score ?? 0);
      const feedbackText = String(payload?.feedback ?? payload?.evaluation_notes ?? "").trim();
      const decision = payload?.decision; // "HIRED", "REJECTED", "NO_ACTION"

      const res = await fetch(`${DIRECTUS_BASE}/items/vs_interview/${interviewId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          evaluation_score: score,
          feedback: feedbackText,
          interview_status: "COMPLETED",
          updated_by_user_id: userId,
          updated_at: nowPH,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Directus patch evaluation error:", text);
        return NextResponse.json(
          { error: "Failed to save evaluation." },
          { status: res.status }
        );
      }

      // Fetch the interview to get application_id
      const ivRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview/${interviewId}?fields=application_id`,
        { headers: getHeaders(), cache: "no-store" }
      );

      if (ivRes.ok && decision && decision !== "NO_ACTION") {
        const ivData = (await ivRes.json()).data;
        if (ivData?.application_id) {
          await fetch(
            `${DIRECTUS_BASE}/items/vs_job_application/${ivData.application_id}?fields=application_id,application_status,client_notes`,
            {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({
                application_status: decision,
                client_notes: feedbackText ? `Interview feedback: ${feedbackText}` : undefined,
              }),
            }
          );

          // Dispatch hiring / rejection email to candidate
          try {
            const appFetch = await fetch(
              `${DIRECTUS_BASE}/items/vs_job_application/${ivData.application_id}?fields=user_id,job_id`,
              { headers: getHeaders(), cache: "no-store" }
            );
            if (appFetch.ok) {
              const applicationObj = (await appFetch.json()).data;
              if (applicationObj?.user_id) {
                const userRes = await fetch(
                  `${DIRECTUS_BASE}/items/vs_user/${applicationObj.user_id}?fields=user_email,user_fname,user_lname`,
                  { headers: getHeaders(), cache: "no-store" }
                );
                if (userRes.ok) {
                  const candidate = (await userRes.json()).data;
                  if (candidate?.user_email) {
                    let jobTitle = "Unknown Position";
                    let companyName = "Employer";

                    if (applicationObj.job_id) {
                      const jobRes = await fetch(
                        `${DIRECTUS_BASE}/items/vs_job_posting/${applicationObj.job_id}?fields=job_title,company_id`,
                        { headers: getHeaders(), cache: "no-store" }
                      );
                      if (jobRes.ok) {
                        const jData = (await jobRes.json()).data;
                        if (jData?.job_title) jobTitle = jData.job_title;
                        if (jData?.company_id) {
                          const compRes = await fetch(
                            `${DIRECTUS_BASE}/items/vs_company/${jData.company_id}?fields=company_name`,
                            { headers: getHeaders(), cache: "no-store" }
                          );
                          if (compRes.ok) {
                            companyName = (await compRes.json()).data?.company_name || companyName;
                          }
                        }
                      }
                    }

                    const candidateName = `${candidate.user_fname} ${candidate.user_lname}`.trim();
                    if (decision === "HIRED") {
                      await sendHiringEmail(candidate.user_email, {
                        candidateName,
                        companyName,
                        jobTitle,
                        notes: feedbackText || null,
                      }).catch((e) => console.error("Hiring mail error:", e));
                    } else if (decision === "REJECTED") {
                      await sendRejectionEmail(candidate.user_email, {
                        candidateName,
                        companyName,
                        jobTitle,
                        notes: feedbackText || null,
                      }).catch((e) => console.error("Rejection mail error:", e));
                    }
                  }
                }
              }
            }
          } catch (evalMailErr) {
            console.error("Error sending evaluation email:", evalMailErr);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
  } catch (err: unknown) {
    console.error("PATCH /api/client/interviews/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
