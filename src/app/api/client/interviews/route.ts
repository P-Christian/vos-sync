import { NextRequest, NextResponse } from "next/server";
import { sendInterviewScheduledEmail, isEmailEnabledForUser } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { createFreelancerNotification } from "@/lib/notifications/services/freelancer-notifications";
import { getPHTimeString } from "@/lib/utils";

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
  } catch {
    return null;
  }
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
  interviewer_user_id: number;
  scheduled_at: string;
  duration_minutes?: number;
  timezone?: string;
  interview_format: string;
  meeting_link?: string | null;
  meeting_location?: string | null;
  interview_notes?: string | null;
  interview_status: string;
  cancel_reason?: string | null;
  created_by_user_id?: number;
  updated_by_user_id?: number | null;
  created_at?: string;
}

interface DirectusInterviewApp {
  interview_application_id: number;
  interview_id: number;
  application_id: number;
  attendance_status: string;
  candidate_notes?: string | null;
  feedback?: string | null;
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

// ─── GET — List interviews for company ─────────────────────────────────

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
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch interviews.");

    const rawInterviews: DirectusInterview[] = json.data ?? [];
    if (rawInterviews.length === 0) return NextResponse.json({ interviews: [] });

    const interviewIds = rawInterviews.map((iv) => iv.interview_id);

    // Fetch junction table records vs_interview_application
    const junctionRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_interview_application?filter[interview_id][_in]=${interviewIds.join(",")}&fields=*&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    const junctionApps: DirectusInterviewApp[] = junctionRes.ok
      ? (await junctionRes.json()).data ?? []
      : [];

    const appIds = [...new Set(junctionApps.map((ja) => ja.application_id).filter(Boolean))];

    const appsMap: Record<number, ApplicationSummary> = {};
    if (appIds.length > 0) {
      const appsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application?filter[application_id][_in]=${appIds.join(",")}&fields=application_id,user_id,job_id,application_status&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (appsRes.ok) {
        const appsJson = await appsRes.json();
        (appsJson.data ?? []).forEach((a: ApplicationSummary) => {
          appsMap[a.application_id] = a;
        });
      }
    }

    const userIds = [...new Set(Object.values(appsMap).map((a) => a.user_id).filter(Boolean))];
    const jobIds = [...new Set(Object.values(appsMap).map((a) => a.job_id).filter(Boolean))];

    const usersMap: Record<number, VsUser> = {};
    if (userIds.length > 0) {
      const usersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_contact,profile_image_url&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (usersRes.ok) {
        (await usersRes.json()).data?.forEach((u: VsUser) => {
          usersMap[u.user_id] = u;
        });
      }
    }

    const jobsMap: Record<number, string> = {};
    if (jobIds.length > 0) {
      const jobsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (jobsRes.ok) {
        (await jobsRes.json()).data?.forEach((j: DirectusJob) => {
          jobsMap[j.job_id] = j.job_title;
        });
      }
    }

    // Map candidates to interviews
    const interviews = rawInterviews.map((iv) => {
      const matchedJunction = junctionApps.filter((ja) => ja.interview_id === iv.interview_id);

      const applications = matchedJunction.map((ja) => {
        const app = appsMap[ja.application_id] ?? { user_id: null, job_id: null, application_status: "INTERVIEW_SCHEDULED" };
        const u = app.user_id ? usersMap[app.user_id] : null;
        const applicantName = u ? `${u.user_fname} ${u.user_lname}`.trim() : `Applicant #${app.user_id}`;
        const jobTitle = app.job_id ? (jobsMap[app.job_id] ?? "Unknown Role") : "Unknown Role";

        return {
          ...ja,
          applicant_name: applicantName,
          applicant_email: u?.user_email ?? "",
          applicant_phone: u?.user_contact ?? null,
          applicant_avatar: formatAvatarUrl(u?.profile_image_url),
          job_id: app.job_id ?? undefined,
          job_title: jobTitle,
          application_status: app.application_status,
        };
      });

      return {
        ...iv,
        applications,
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

// ─── POST — Create new interview schedule ──────────────────────────────────

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

    const rawAppIds: number[] = Array.isArray(body.application_ids)
      ? body.application_ids.map(Number).filter(Boolean)
      : body.application_id
      ? [Number(body.application_id)]
      : [];

    const errors: string[] = [];
    if (rawAppIds.length === 0) errors.push("At least one candidate application is required.");
    if (!body.scheduled_at && (!body.interview_date || !body.interview_time))
      errors.push("Scheduled Date & Time is required.");
    if (!body.interview_format) errors.push("Interview format is required.");

    if (errors.length > 0)
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    let scheduledAt = body.scheduled_at;
    if (!scheduledAt && body.interview_date && body.interview_time) {
      scheduledAt = `${body.interview_date} ${body.interview_time}:00`;
    }

    // Server-side schedule overlap check with 15-minute buffer
    const newStart = new Date(scheduledAt.replace(" ", "T")).getTime();
    if (!isNaN(newStart)) {
      const durationMs = (Number(body.duration_minutes) || 60) * 60 * 1000;
      const bufferMs = 15 * 60 * 1000;
      const newEndWithBuffer = newStart + durationMs + bufferMs;

      const overlapRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview?filter[company_id][_eq]=${companyId}&filter[interview_status][_in]=SCHEDULED,CONFIRMED,RESCHEDULED&fields=interview_id,scheduled_at,duration_minutes,interview_status&limit=100`,
        { headers: getHeaders(), cache: "no-store" }
      );

      if (overlapRes.ok) {
        const existingActive: DirectusInterview[] = (await overlapRes.json()).data ?? [];

        for (const existing of existingActive) {
          const exStart = new Date(existing.scheduled_at.replace(" ", "T")).getTime();
          if (isNaN(exStart)) continue;
          const exEnd = exStart + (existing.duration_minutes || 60) * 60 * 1000;

          if (newStart < (exEnd + bufferMs) && newEndWithBuffer > exStart) {
            return NextResponse.json(
              {
                error: `Schedule Conflict: An active interview is already scheduled for this company at ${formatInterviewDateTime(existing.scheduled_at)} (including 15m buffer).`,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    const nowPH = getPHTimeString();

    // 1. Insert schedule into vs_interview
    const interviewPayload = {
      company_id: companyId,
      interviewer_user_id: userId,
      scheduled_at: scheduledAt,
      duration_minutes: Number(body.duration_minutes) || 60,
      timezone: body.timezone || "Asia/Manila",
      interview_format: body.interview_format,
      meeting_link: body.meeting_link?.trim() || null,
      meeting_location: body.meeting_location?.trim() || null,
      interview_notes: body.interview_notes?.trim() || null,
      interview_status: "SCHEDULED",
      created_by_user_id: userId,
      created_at: nowPH,
    };

    const createIvRes = await fetch(`${DIRECTUS_BASE}/items/vs_interview`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(interviewPayload),
    });

    if (!createIvRes.ok) {
      const text = await createIvRes.text();
      console.error("Directus create vs_interview error:", text);
      return NextResponse.json(
        { error: "Failed to schedule interview." },
        { status: createIvRes.status }
      );
    }

    const createdInterview: DirectusInterview = (await createIvRes.json()).data;
    const newInterviewId = createdInterview.interview_id;

    // 2. Insert records into vs_interview_application junction table
    const junctionPayloads = rawAppIds.map((appId) => ({
      interview_id: newInterviewId,
      application_id: appId,
      attendance_status: "PENDING",
      created_at: nowPH,
    }));

    await fetch(`${DIRECTUS_BASE}/items/vs_interview_application`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(junctionPayloads),
    });

    // 3. Update application status to INTERVIEW_SCHEDULED & dispatch emails/notifications
    for (const appId of rawAppIds) {
      await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${appId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ application_status: "INTERVIEW_SCHEDULED" }),
      }).catch((e) => console.error("Error updating app status:", e));

      // Dispatch notifications to candidate
      try {
        const appRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_job_application/${appId}?fields=user_id,job_id`,
          { headers: getHeaders(), cache: "no-store" }
        );
        if (appRes.ok) {
          const appData = (await appRes.json()).data;
          if (appData?.user_id) {
            const candidateUserId = appData.user_id;

            const userRes = await fetch(
              `${DIRECTUS_BASE}/items/vs_user/${candidateUserId}?fields=user_email,user_fname,user_lname`,
              { headers: getHeaders(), cache: "no-store" }
            );

            if (userRes.ok) {
              const candidate = (await userRes.json()).data;
              if (candidate?.user_email) {
                let jobTitle = "Unknown Position";
                let companyName = "Employer";

                if (appData.job_id) {
                  const jobRes = await fetch(
                    `${DIRECTUS_BASE}/items/vs_job_posting/${appData.job_id}?fields=job_title,company_id`,
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

                const emailEnabled = await isEmailEnabledForUser(candidateUserId, "INTERVIEW_SCHEDULED");
                if (emailEnabled) {
                  await sendInterviewScheduledEmail(candidate.user_email, {
                    candidateName: `${candidate.user_fname} ${candidate.user_lname}`.trim(),
                    companyName,
                    jobTitle,
                    scheduledAt,
                    timezone: body.timezone || "Asia/Manila",
                    durationMinutes: Number(body.duration_minutes) || 60,
                    interviewFormat: body.interview_format,
                    meetingLink: body.meeting_link?.trim() || null,
                    meetingLocation: body.meeting_location?.trim() || null,
                    candidateNotes: body.candidate_notes?.trim() || null,
                  }).catch((e) => console.error("Error sending scheduled email:", e));
                }

                await createSystemMessage({
                  clientId: userId,
                  freelancerId: candidateUserId,
                  jobId: appData.job_id ?? null,
                  text: `Interview scheduled for ${scheduledAt}.`,
                  senderId: userId,
                  systemEventType: "INTERVIEW_SCHEDULED",
                  interviewId: newInterviewId,
                }).catch((e) => console.error("Error sending system msg:", e));

                await createFreelancerNotification({
                  event_type: "interview_scheduled",
                  recipient_user_id: candidateUserId,
                  entity_type: "vs_interview",
                  entity_id: newInterviewId,
                  category: "INTERVIEW",
                  title: "New Interview Scheduled",
                  message: `You have an interview scheduled with ${companyName} for ${formatInterviewDateTime(scheduledAt)}.`,
                  action_url: "/vos-sync/freelancer/applications",
                }).catch((e) => console.error("Error sending notification:", e));
              }
            }
          }
        }
      } catch (notifyErr) {
        console.error("Error during candidate notification pipeline:", notifyErr);
      }
    }

    return NextResponse.json({ interview: createdInterview });
  } catch (err: unknown) {
    console.error("POST /api/client/interviews error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
