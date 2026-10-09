import { NextRequest, NextResponse } from "next/server";
import { sendHiringEmail, sendRejectionEmail, isEmailEnabledForUser } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { getPHTimeString } from "@/lib/utils";
import {
  authenticateRequest,
  isAdministratorSession,
  isClientSession,
} from "@/lib/authenticated-session";

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

export function formatInterviewDateTime(dateTimeStr: string): string {
  try {
    const dateObj = new Date(dateTimeStr.replace(" ", "T"));
    if (isNaN(dateObj.getTime())) return dateTimeStr;

    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${formattedDate} at ${formattedTime}`;
  } catch {
    return dateTimeStr;
  }
}

// ─── PATCH — Update interview schedule details or candidate evaluation ─────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const targetId = parseInt(id, 10);

    if (!targetId || isNaN(targetId)) {
      return NextResponse.json({ error: "Invalid ID parameter." }, { status: 400 });
    }

    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const isAdmin = isAdministratorSession(session);
    if (!isAdmin && !isClientSession(session)) {
      return NextResponse.json({ error: "Forbidden: Clients only." }, { status: 403 });
    }

    const userId = Number(session.userId);
    let callerCompanyId: number | null = null;
    if (!isAdmin) {
      callerCompanyId = await getCompanyId(userId);
      if (!callerCompanyId) {
        return NextResponse.json(
          { error: "Forbidden: No company profile found for user." },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type;
    const payload = body?.payload;

    const nowPH = getPHTimeString();

    if (type === "DETAILS") {
      const interviewId = targetId;

      // Check current interview existence and verify company ownership
      const currIvRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview/${interviewId}?fields=company_id,duration_minutes`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (!currIvRes.ok) {
        return NextResponse.json({ error: "Interview not found." }, { status: 404 });
      }
      const currIv = (await currIvRes.json()).data;
      if (!currIv) {
        return NextResponse.json({ error: "Interview not found." }, { status: 404 });
      }

      if (!isAdmin && Number(currIv.company_id) !== Number(callerCompanyId)) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to modify this interview." },
          { status: 403 }
        );
      }

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
      if (payload?.cancel_reason !== undefined) updateData.cancel_reason = payload.cancel_reason;

      if (payload?.scheduled_at) {
        const targetCompanyId = currIv?.company_id;

        if (targetCompanyId) {
          const newStart = new Date(payload.scheduled_at.replace(" ", "T")).getTime();
          if (!isNaN(newStart)) {
            const durMinutes = Number(payload.duration_minutes || currIv?.duration_minutes) || 60;
            const durationMs = durMinutes * 60 * 1000;
            const includeBuffer = payload.include_buffer !== false;
            const bufferMs = includeBuffer ? 15 * 60 * 1000 : 0;

            const overlapRes = await fetch(
              `${DIRECTUS_BASE}/items/vs_interview?filter[company_id][_eq]=${targetCompanyId}&filter[interview_status][_in]=SCHEDULED,CONFIRMED,RESCHEDULED&filter[interview_id][_neq]=${interviewId}&fields=interview_id,scheduled_at,duration_minutes&limit=100`,
              { headers: getHeaders(), cache: "no-store" }
            );

            if (overlapRes.ok) {
              const existingActive = (await overlapRes.json()).data ?? [];
              const newEnd = newStart + durationMs;
              for (const existing of existingActive) {
                const exStart = new Date(existing.scheduled_at.replace(" ", "T")).getTime();
                if (isNaN(exStart)) continue;
                const exEnd = exStart + (existing.duration_minutes || 60) * 60 * 1000;

                const isDirectOverlap = (newStart >= exStart && newStart < exEnd) || (newStart < exStart && newEnd > exStart);
                const isBufferOverlap = bufferMs > 0 && (newStart >= exEnd && newStart < (exEnd + bufferMs));

                if (isDirectOverlap || isBufferOverlap) {
                  return NextResponse.json(
                    {
                      error: `Schedule Conflict: An active interview is already scheduled for this company at ${formatInterviewDateTime(existing.scheduled_at)}${includeBuffer ? " (including 15m buffer)" : ""}.`,
                    },
                    { status: 409 }
                  );
                }
              }
            }
          }
        }
      }

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

      // Cancellation: application status remains INTERVIEWING. The candidate
      // passed screening — only the interview session was cancelled. They stay
      // eligible for rebooking without reverting to SHORTLISTED.

      return NextResponse.json({ success: true });
    }

    if (type === "EVALUATION") {
      const interviewApplicationId = targetId;
      const feedbackText = String(payload?.feedback ?? "").trim();
      const attendanceStatus = payload?.attendance_status || "ATTENDED";
      const decision = payload?.decision; // "HIRED", "REJECTED", "NO_ACTION"

      // 1. Fetch junction row first to verify existence and check ownership
      const fetchJunctionRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview_application/${interviewApplicationId}?fields=application_id,interview_id`,
        { headers: getHeaders(), cache: "no-store" }
      );

      if (!fetchJunctionRes.ok) {
        return NextResponse.json(
          { error: "Interview application record not found." },
          { status: 404 }
        );
      }

      const jaData = (await fetchJunctionRes.json()).data;
      if (!jaData) {
        return NextResponse.json(
          { error: "Interview application record not found." },
          { status: 404 }
        );
      }

      if (!isAdmin) {
        if (!jaData.interview_id) {
          return NextResponse.json({ error: "Invalid interview reference." }, { status: 400 });
        }
        const parentIvRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_interview/${jaData.interview_id}?fields=company_id`,
          { headers: getHeaders(), cache: "no-store" }
        );
        if (!parentIvRes.ok) {
          return NextResponse.json({ error: "Parent interview not found." }, { status: 404 });
        }
        const parentIv = (await parentIvRes.json()).data;
        if (Number(parentIv?.company_id) !== Number(callerCompanyId)) {
          return NextResponse.json(
            { error: "Forbidden: You do not have permission to evaluate this candidate." },
            { status: 403 }
          );
        }
      }

      // 2. Update vs_interview_application junction row
      const patchJunctionRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview_application/${interviewApplicationId}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            attendance_status: attendanceStatus,
            feedback: feedbackText,
            candidate_notes: payload?.candidate_notes || undefined,
          }),
        }
      );

      if (!patchJunctionRes.ok) {
        const text = await patchJunctionRes.text();
        console.error("Directus patch evaluation error:", text);
        return NextResponse.json(
          { error: "Failed to save candidate evaluation." },
          { status: patchJunctionRes.status }
        );
      }

      if (fetchJunctionRes.ok) {
        const jaData = (await fetchJunctionRes.json()).data;
        if (jaData?.application_id) {
          // NO_ACTION (Keep Under Review): leave application status unchanged.
          // The interview session is marked COMPLETED, but the candidate remains
          // INTERVIEWING and is eligible for additional interview rounds.
          if (decision === "HIRED" || decision === "REJECTED") {
            const targetStatus = decision;

            await fetch(
              `${DIRECTUS_BASE}/items/vs_job_application/${jaData.application_id}?fields=application_id,application_status,client_notes`,
              {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({
                  application_status: targetStatus,
                  client_notes: feedbackText ? `Interview feedback: ${feedbackText}` : undefined,
                }),
              }
            );
          } else if (feedbackText) {
            // NO_ACTION: only update feedback notes, not the status
            await fetch(
              `${DIRECTUS_BASE}/items/vs_job_application/${jaData.application_id}?fields=application_id,client_notes`,
              {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({
                  client_notes: `Interview feedback: ${feedbackText}`,
                }),
              }
            );
          }

          // Check if all candidates for the interview have been evaluated, update vs_interview status to COMPLETED
          if (jaData.interview_id) {
            const allCandidatesRes = await fetch(
              `${DIRECTUS_BASE}/items/vs_interview_application?filter[interview_id][_eq]=${jaData.interview_id}&fields=attendance_status`,
              { headers: getHeaders(), cache: "no-store" }
            );

            if (allCandidatesRes.ok) {
              const allCandidates = (await allCandidatesRes.json()).data ?? [];
              const allEvaluated = allCandidates.every(
                (c: { attendance_status: string }) => c.attendance_status !== "PENDING"
              );
              if (allEvaluated) {
                await fetch(`${DIRECTUS_BASE}/items/vs_interview/${jaData.interview_id}`, {
                  method: "PATCH",
                  headers: getHeaders(),
                  body: JSON.stringify({
                    interview_status: "COMPLETED",
                    updated_by_user_id: userId,
                    updated_at: nowPH,
                  }),
                });
              }
            }
          }

          // Dispatch email notification to candidate if decision is HIRED / REJECTED
          try {
            const appFetch = await fetch(
              `${DIRECTUS_BASE}/items/vs_job_application/${jaData.application_id}?fields=user_id,job_id`,
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
                    const statusEmailEnabled = await isEmailEnabledForUser(
                      applicationObj.user_id,
                      "APPLICATION_STATUS_UPDATED"
                    );

                    if (statusEmailEnabled) {
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

                    // Create System Message in conversation for HIRED / REJECTED
                    if (decision === "HIRED" || decision === "REJECTED") {
                      const systemText =
                        decision === "HIRED"
                          ? "Client hired you."
                          : "Application status changed: REJECTED";

                      const statusEventType =
                        decision === "HIRED" ? "HIRED" : "APPLICATION_STATUS_CHANGED";

                      await createSystemMessage({
                        clientId: userId,
                        freelancerId: applicationObj.user_id,
                        jobId: applicationObj.job_id ?? null,
                        text: systemText,
                        senderId: userId,
                        systemEventType: statusEventType,
                        applicationId: jaData.application_id ?? null,
                        interviewId: jaData.interview_id ?? null,
                      }).catch((e) =>
                        console.error("Status change system message error on interview evaluate:", e)
                      );
                    }
                  }
                }
              }
            }
          } catch (evalMailErr) {
            console.error("Error sending evaluation email/system message:", evalMailErr);
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
