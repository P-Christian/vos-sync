// src/app/api/client/interviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { sendInterviewScheduledEmail, isEmailEnabledForUser } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { createFreelancerNotification } from "@/lib/notifications/services/freelancer-notifications";
import { createEmployerNotification } from "@/lib/notifications/services/employer-notifications";
import { isInAppEnabledForUser } from "@/lib/notifications/preference-check";

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

function formatAvatarUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/client/assets/")) {
    return trimmed;
  }
  const parts = trimmed.split("/");
  const fileId = parts[parts.length - 1];
  return `/api/client/assets/${fileId}`;
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

async function getCompanyId(userId: number): Promise<number | null> {
  const res = await fetch(
    `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
    { headers: getHeaders(), cache: "no-store" }
  );
  const json = await res.json();
  return json.data?.[0]?.company_id ?? null;
}

interface DirectusInterview {
  interview_id: number;
  company_id: number;
  application_id: number;
  interviewer_user_id: number;
  scheduled_at: string;
  duration_minutes?: number;
  timezone?: string;
  interview_format: string;
  meeting_link?: string | null;
  meeting_location?: string | null;
  interview_notes?: string | null;
  candidate_notes?: string | null;
  feedback?: string | null;
  evaluation_score?: number | null;
  interview_status: string;
  cancel_reason?: string | null;
  created_by_user_id?: number;
  updated_by_user_id?: number | null;
  created_at?: string;
}

interface ApplicationSummary {
  application_id: number;
  user_id: number;
  job_id: number;
  application_status: string;
}

interface VsUser {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_contact?: string | null;
  profile_image_url?: string | null;
}

interface DirectusJob {
  job_id: number;
  job_title: string;
}

// ─── GET — List interviews for the company ─────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Company not found." }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let filterQuery = `filter[company_id][_eq]=${companyId}`;
    if (status && status !== "ALL") filterQuery += `&filter[interview_status][_eq]=${status}`;

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_interview?${filterQuery}&sort[]=-created_at&sort[]=-interview_id&fields=*`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    const rawInterviews: DirectusInterview[] = json.data ?? [];

    if (rawInterviews.length === 0) {
      return NextResponse.json({ interviews: [] });
    }

    // Resolve applications for these interviews
    const appIds = [...new Set(rawInterviews.map((iv) => iv.application_id).filter(Boolean))];
    const appsMap: Record<number, ApplicationSummary> = {};
    if (appIds.length > 0) {
      const appsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application?filter[application_id][_in]=${appIds.join(",")}&fields=application_id,user_id,job_id,application_status&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (appsRes.ok) {
        const appsJson = await appsRes.json();
        const appsList: ApplicationSummary[] = appsJson.data ?? [];
        appsList.forEach((a) => {
          appsMap[a.application_id] = a;
        });
      }
    }

    // Fetch screening answers from vs_job_application_answer & vs_job_screening_question
    const screeningMap: Record<number, { question_id: number; question_text: string; answer_text: string }[]> = {};
    if (appIds.length > 0) {
      const ansRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application_answer?filter[application_id][_in]=${appIds.join(",")}&fields=application_id,question_id,answer_text&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (ansRes.ok) {
        const ansJson = await ansRes.json();
        const ansList: { application_id: number; question_id: number; answer_text: string }[] = ansJson.data ?? [];
        const qIds = [...new Set(ansList.map((a) => a.question_id).filter(Boolean))];

        const qTextMap: Record<number, string> = {};
        if (qIds.length > 0) {
          const qRes = await fetch(
            `${DIRECTUS_BASE}/items/vs_job_screening_question?filter[question_id][_in]=${qIds.join(",")}&fields=question_id,question_text&limit=500`,
            { headers: getHeaders(), cache: "no-store" }
          );
          if (qRes.ok) {
            const qJson = await qRes.json();
            const qList: { question_id: number; question_text: string }[] = qJson.data ?? [];
            qList.forEach((q) => {
              qTextMap[q.question_id] = q.question_text;
            });
          }
        }

        ansList.forEach((a) => {
          if (!screeningMap[a.application_id]) screeningMap[a.application_id] = [];
          screeningMap[a.application_id].push({
            question_id: a.question_id,
            question_text: qTextMap[a.question_id] || `Question #${a.question_id}`,
            answer_text: a.answer_text,
          });
        });
      }
    }

    // Resolve user IDs and job IDs
    const userIds = [...new Set(Object.values(appsMap).map((a) => a.user_id).filter(Boolean))];
    const jobIds = [...new Set(Object.values(appsMap).map((a) => a.job_id).filter(Boolean))];

    const usersMap: Record<number, VsUser> = {};
    if (userIds.length > 0) {
      const usersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_contact,profile_image_url&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        const usersList: VsUser[] = usersJson.data ?? [];
        usersList.forEach((u) => {
          usersMap[u.user_id] = u;
        });
      }
    }

    const jobsMap: Record<number, string> = {};
    if (jobIds.length > 0) {
      const jobsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json();
        const jobsList: DirectusJob[] = jobsJson.data ?? [];
        jobsList.forEach((j) => {
          jobsMap[j.job_id] = j.job_title;
        });
      }
    }

    // Enrich interviews
    const interviews = rawInterviews.map((iv) => {
      const app = appsMap[iv.application_id] ?? { user_id: null, job_id: null, application_status: "INTERVIEW_SCHEDULED" };
      const u = app.user_id ? usersMap[app.user_id] : null;
      const applicantName = u ? `${u.user_fname} ${u.user_lname}`.trim() : `Applicant #${app.user_id}`;
      const jobTitle = app.job_id ? (jobsMap[app.job_id] ?? "Unknown Role") : "Unknown Role";
      return {
        ...iv,
        applicant_name: applicantName,
        applicant_email: u?.user_email ?? "",
        applicant_phone: u?.user_contact ?? null,
        applicant_avatar: formatAvatarUrl(u?.profile_image_url),
        job_title: jobTitle,
        job_id: app.job_id ?? undefined,
        application_status: app.application_status,
        screening_answers: screeningMap[iv.application_id] ?? null,
      };
    });

    return NextResponse.json({ interviews });
  } catch (err: unknown) {
    console.error("GET /api/client/interviews error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST — Create a new interview schedule matching vs_interview DDL ────────

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Company not found." }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    const errors: string[] = [];
    if (!body.application_id) errors.push("Application ID is required.");
    if (!body.scheduled_at && (!body.interview_date || !body.interview_time))
      errors.push("Scheduled Date & Time is required.");
    if (!body.interview_format) errors.push("Interview format is required.");

    if (errors.length > 0)
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    // Check for existing active interview for this application
    const checkActiveRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_interview?filter[application_id][_eq]=${body.application_id}&filter[interview_status][_in]=SCHEDULED,CONFIRMED,RESCHEDULED&fields=interview_id,interview_status&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (checkActiveRes.ok) {
      const activeJson = await checkActiveRes.json();
      if (Array.isArray(activeJson.data) && activeJson.data.length > 0) {
        return NextResponse.json(
          {
            error:
              "An active interview is already scheduled for this candidate application. Please reschedule the existing interview or cancel it first.",
          },
          { status: 409 }
        );
      }
    }

    // Format scheduled_at datetime string
    let scheduledAt = body.scheduled_at;
    if (!scheduledAt && body.interview_date && body.interview_time) {
      scheduledAt = `${body.interview_date} ${body.interview_time}:00`;
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const interviewPayload = {
      company_id: companyId,
      application_id: Number(body.application_id),
      interviewer_user_id: userId,
      scheduled_at: scheduledAt,
      duration_minutes: Number(body.duration_minutes) || 60,
      timezone: body.timezone || "Asia/Manila",
      interview_format: body.interview_format,
      meeting_link: body.meeting_link?.trim() || null,
      meeting_location: body.meeting_location?.trim() || null,
      interview_notes: body.interview_notes?.trim() || null,
      candidate_notes: body.candidate_notes?.trim() || null,
      interview_status: "SCHEDULED",
      created_by_user_id: userId,
      created_at: nowPH,
      updated_at: nowPH,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_interview`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(interviewPayload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to create interview." },
        { status: res.status }
      );
    }

    // Update application status
    const appRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${body.application_id}?fields=application_id,user_id,job_id`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (appRes.ok) {
      const appData = (await appRes.json()).data;
      await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${body.application_id}?fields=application_id,application_status`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ application_status: "INTERVIEW_SCHEDULED" }),
      });

      // Dispatch candidate notification event
      if (appData?.user_id) {
        try {
          // Notify candidate (freelancer) via vs_freelancer_notification
          const candidateInAppEnabled = await isInAppEnabledForUser(appData.user_id, "INTERVIEW_SCHEDULED");
          if (candidateInAppEnabled) {
            await createFreelancerNotification({
              event_type: "INTERVIEW_SCHEDULED",
              recipient_user_id: appData.user_id,
              entity_type: "vs_interview",
              entity_id: json.data?.interview_id,
              category: "INTERVIEW_SCHEDULED",
              title: "Interview Scheduled!",
              message: `An interview has been scheduled for ${formatInterviewDateTime(scheduledAt)}.`,
              action_url: "/vos-sync/freelancer/applications",
            }).catch((err: unknown) => console.error("[Freelancer notification] Interview scheduled error:", err));
          }

          // Notify employer (self-notification) via vs_employer_notification
          const employerInAppEnabled = await isInAppEnabledForUser(userId, "INTERVIEW_SCHEDULED");
          if (employerInAppEnabled) {
            await createEmployerNotification({
              event_type: "INTERVIEW_SCHEDULED",
              recipient_user_id: userId,
              entity_type: "vs_interview",
              entity_id: json.data?.interview_id,
              category: "INTERVIEW_SCHEDULED",
              title: "Interview Scheduled",
              message: `You scheduled an interview for ${formatInterviewDateTime(scheduledAt)}.`,
              action_url: "/vos-sync/client/interviews",
            }).catch((err: unknown) => console.error("[Employer notification] Interview scheduled error:", err));
          }
          // Send Gmail invitation to applicant
          try {
            const userRes = await fetch(
              `${DIRECTUS_BASE}/items/vs_user/${appData.user_id}?fields=user_email,user_fname,user_lname`,
              { headers: getHeaders(), cache: "no-store" }
            );
            if (userRes.ok) {
              const candidate = (await userRes.json()).data;
              if (candidate?.user_email) {
                // Fetch job & company title
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

                const emailEnabled = await isEmailEnabledForUser(appData.user_id, "INTERVIEW_SCHEDULED");
                if (emailEnabled) {
                  await sendInterviewScheduledEmail(candidate.user_email, {
                    candidateName: `${candidate.user_fname} ${candidate.user_lname}`.trim(),
                    companyName,
                    jobTitle,
                    scheduledAt,
                    timezone: body.timezone || "Asia/Manila",
                    durationMinutes: Number(body.duration_minutes) || 60,
                    interviewFormat: body.interview_format || "ONLINE",
                    meetingLink: body.meeting_link?.trim() || null,
                    meetingLocation: body.meeting_location?.trim() || null,
                    candidateNotes: body.candidate_notes?.trim() || null,
                  }).catch((mailErr) => console.error("Email send error:", mailErr));
                }
              }
            }
          } catch (mailDispatchErr) {
            console.error("Error fetching candidate details for email:", mailDispatchErr);
          }
          // Dispatch System Message to Conversation
          await createSystemMessage({
            clientId: userId,
            freelancerId: appData.user_id,
            jobId: appData.job_id ?? null,
            text: `Interview scheduled for ${scheduledAt}.`,
            senderId: userId,
            systemEventType: "INTERVIEW_SCHEDULED",
            interviewId: json.data?.interview_id ?? null,
          }).catch((err) => console.error("Error creating interview system message:", err));
        } catch (notifErr) {
          console.error("Notification dispatch error:", notifErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Interview scheduled successfully.",
      interview: json.data,
    });
  } catch (err: unknown) {
    console.error("POST /api/client/interviews error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
