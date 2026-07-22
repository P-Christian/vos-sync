// src/app/api/messaging/system-card/route.ts

import { NextRequest, NextResponse } from "next/server";

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

  // Already proxied — use as-is
  if (trimmed.startsWith("/api/freelancer/assets/")) return trimmed;

  // data: URI — use as-is
  if (trimmed.startsWith("data:")) return trimmed;

  // Full Directus URL (https://directus.host/assets/UUID) — extract UUID and proxy it
  const assetsMatch = trimmed.match(/\/assets\/([^/?#]+)/);
  if (assetsMatch?.[1]) return `/api/freelancer/assets/${assetsMatch[1]}`;

  // Bare UUID or path segment — use last segment
  const parts = trimmed.split("/");
  const fileId = parts[parts.length - 1];
  return fileId ? `/api/freelancer/assets/${fileId}` : null;
}

export async function GET(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    // ── Params ────────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("message_id");

    if (!messageId || isNaN(Number(messageId))) {
      return NextResponse.json({ error: "message_id is required." }, { status: 400 });
    }

    // ── Fetch message to get conversation_id ──────────────────────────────
    const msgRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_message/${messageId}?fields=message_id,conversation_id,message_type`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!msgRes.ok) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const msg = (await msgRes.json()).data;
    if (!msg?.conversation_id) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    // ── Verify user belongs to this conversation ──────────────────────────
    const convRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation/${msg.conversation_id}?fields=client_id,freelancer_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convRes.ok) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const conv = (await convRes.json()).data;
    if (userId !== conv.client_id && userId !== conv.freelancer_id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // ── Fetch vs_system_message row ───────────────────────────────────────
    const smRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_system_message?filter[message_id][_eq]=${messageId}&fields=system_message_id,event_type,application_id,interview_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!smRes.ok) {
      return NextResponse.json({ error: "System message data not found." }, { status: 404 });
    }

    const smData = ((await smRes.json()).data ?? [])[0];
    if (!smData) {
      return NextResponse.json({ error: "System message data not found." }, { status: 404 });
    }

    const { event_type, application_id, interview_id } = smData;

    // ── Resolve card data by event type ───────────────────────────────────

    // Application-based events
    if (
      event_type === "APPLICATION_SUBMITTED" ||
      event_type === "APPLICATION_STATUS_CHANGED" ||
      event_type === "HIRED"
    ) {
      if (!application_id) {
        return NextResponse.json({ error: "Application reference missing." }, { status: 422 });
      }

      const appRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application/${application_id}?fields=application_id,user_id,job_id,application_status,expected_salary,applied_at,cover_letter,portfolio_url`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (!appRes.ok) {
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
      }
      const app = (await appRes.json()).data;
      const applicantUserId = app?.user_id;

      // Parallel requests for user, job, resume, and social links
      const [userRes, jobRes, resumeRes, socialRes] = await Promise.all([
        applicantUserId
          ? fetch(
              `${DIRECTUS_BASE}/items/vs_user/${applicantUserId}?fields=user_fname,user_lname,user_email,user_contact,profile_image_url`,
              { headers: getHeaders(), cache: "no-store" }
            ).then((r) => (r.ok ? r.json() : { data: null }))
          : Promise.resolve({ data: null }),

        app?.job_id
          ? fetch(
              `${DIRECTUS_BASE}/items/vs_job_posting/${app.job_id}?fields=job_title,salary_min,salary_max`,
              { headers: getHeaders(), cache: "no-store" }
            ).then((r) => (r.ok ? r.json() : { data: null }))
          : Promise.resolve({ data: null }),

        applicantUserId
          ? fetch(
              `${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[user_id][_eq]=${applicantUserId}&fields=id,file_name,file_path,is_primary`,
              { headers: getHeaders(), cache: "no-store" }
            ).then((r) => (r.ok ? r.json() : { data: [] }))
          : Promise.resolve({ data: [] }),

        applicantUserId
          ? fetch(
              `${DIRECTUS_BASE}/items/vs_user_social_links?filter[user_id][_eq]=${applicantUserId}&fields=id,platform_name,url`,
              { headers: getHeaders(), cache: "no-store" }
            ).then((r) => (r.ok ? r.json() : { data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const u = userRes.data;
      const j = jobRes.data;
      const resumes = resumeRes.data ?? [];
      const socialLinks = socialRes.data ?? [];

      const applicantName = `${u?.user_fname ?? ""} ${u?.user_lname ?? ""}`.trim() || "Unknown Applicant";
      const applicantAvatar = formatAvatarUrl(u?.profile_image_url);
      const applicantEmail = u?.user_email ?? null;
      const applicantPhone = u?.user_contact ?? null;

      const jobTitle = j?.job_title ?? "Unknown Position";
      const salaryMin = j?.salary_min ?? null;
      const salaryMax = j?.salary_max ?? null;

      const primaryResume =
        resumes.find((r: { is_primary?: boolean }) => r.is_primary) || resumes[0] || null;

      return NextResponse.json({
        event_type,
        application_id,
        application_status: app?.application_status ?? "APPLIED",
        applied_at: app?.applied_at ?? null,
        expected_salary: app?.expected_salary ?? null,
        cover_letter: app?.cover_letter ?? null,
        portfolio_url: app?.portfolio_url ?? null,
        applicant_name: applicantName,
        applicant_avatar: applicantAvatar,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        job_title: jobTitle,
        salary_min: salaryMin,
        salary_max: salaryMax,
        resume: primaryResume
          ? {
              file_name: primaryResume.file_name || "Resume.pdf",
              file_path: formatAvatarUrl(primaryResume.file_path) || primaryResume.file_path,
            }
          : null,
        social_links: socialLinks.map((s: { platform_name?: string; url?: string }) => ({
          platform_name: s.platform_name || "Link",
          url: s.url || "#",
        })),
      });
    }

    // Interview-based events
    if (event_type === "INTERVIEW_SCHEDULED" || event_type === "INTERVIEW_UPDATED") {
      if (!interview_id) {
        return NextResponse.json({ error: "Interview reference missing." }, { status: 422 });
      }

      const ivRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview/${interview_id}?fields=interview_id,scheduled_at,duration_minutes,timezone,interview_format,meeting_link,meeting_location,interview_status`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (!ivRes.ok) {
        return NextResponse.json({ error: "Interview not found." }, { status: 404 });
      }
      const iv = (await ivRes.json()).data;

      return NextResponse.json({
        event_type,
        interview_id,
        scheduled_at: iv?.scheduled_at ?? null,
        duration_minutes: iv?.duration_minutes ?? 60,
        timezone: iv?.timezone ?? "Asia/Manila",
        interview_format: iv?.interview_format ?? "ONLINE",
        meeting_link: iv?.meeting_link ?? null,
        meeting_location: iv?.meeting_location ?? null,
        interview_status: iv?.interview_status ?? null,
      });
    }

    return NextResponse.json({ error: "Unknown event type." }, { status: 400 });
  } catch (err: unknown) {
    console.error("GET /api/messaging/system-card error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
