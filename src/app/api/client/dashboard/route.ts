// src/app/api/client/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

interface JobPostingRecord {
  job_id: number;
  job_title: string;
  job_department?: string;
  job_location: string;
  status: string;
  created_at?: string;
}

interface ApplicationRecord {
  application_id: number;
  job_id: number;
  user_id: number;
  application_status: string;
  applied_at?: string;
}

interface DirectusInterviewRecord {
  interview_id: number;
  company_id: number;
  scheduled_at: string;
  interview_format?: string;
  meeting_link?: string | null;
  interview_status: string;
  created_at?: string;
}

interface DirectusInterviewAppRecord {
  interview_id: number;
  application_id: number;
}

interface VsUser {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_position?: string | null;
  profile_image_url?: string | null;
}

interface DirectusProfile {
  user_id: number;
  profile_headline?: string | null;
}

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

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus base URL not configured." },
        { status: 500 }
      );
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Could not resolve user identity from token." },
        { status: 401 }
      );
    }

    // 1. Resolve company associated with user
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`;
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
    if (!linkRes.ok) {
      return NextResponse.json({ error: "Failed to query company association." }, { status: linkRes.status });
    }

    const linkJson = await linkRes.json();
    const companyId = linkJson.data?.[0]?.company_id;

    if (!companyId) {
      return NextResponse.json({
        success: true,
        onboardingRequired: true,
        message: "Complete your company profile to access dashboard metrics.",
      });
    }

    // 2. Fetch vs_company record
    const VS_COMPANY_FIELDS = [
      "company_id", "company_name", "company_code",
      "company_legal_name",
      "company_address", "company_brgy", "company_city", "company_province", "company_zipCode",
      "registration_no", "company_tin",
      "company_contact", "company_email",
      "company_logo", "company_cover",
      "company_website", "company_description",
      "verification_status", "rejection_reason",
      "profile_completion_percent", "is_public", "is_active",
      "created_at", "updated_at",
    ].join(",");
    const companyUrl = `${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=${VS_COMPANY_FIELDS}`;
    const companyRes = await fetch(companyUrl, { headers: getHeaders(), cache: "no-store" });
    if (!companyRes.ok) {
      if (companyRes.status === 404) {
        return NextResponse.json({
          success: true,
          onboardingRequired: true,
          message: "Complete your company profile to access dashboard metrics.",
        });
      }
      return NextResponse.json({ error: "Failed to fetch company profile details." }, { status: companyRes.status });
    }
    const companyJson = await companyRes.json();
    const companyData = companyJson.data;

    // 3. Fetch vs_job_posting records
    const jobsUrl = `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${companyId}&sort[]=-created_at&limit=100&fields=*`;
    const jobsRes = await fetch(jobsUrl, { headers: getHeaders(), cache: "no-store" });
    const jobsJson = jobsRes.ok ? await jobsRes.json() : { data: [] };
    let jobsList: JobPostingRecord[] = jobsJson.data ?? [];

    if (jobsList.length === 0) {
      // Fallback: check if jobs were saved under created_by_user_id
      const fallbackUrl = `${DIRECTUS_BASE}/items/vs_job_posting?filter[created_by_user_id][_eq]=${userId}&sort[]=-created_at&limit=100&fields=*`;
      const fallbackRes = await fetch(fallbackUrl, { headers: getHeaders(), cache: "no-store" });
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        jobsList = fallbackJson.data ?? [];
      }
    }

    const jobIds: number[] = jobsList.map((j) => j.job_id);

    // 4. Fetch vs_job_application records
    let applicantsList: ApplicationRecord[] = [];
    if (jobIds.length > 0) {
      const appUrl = `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_in]=${jobIds.join(",")}&sort[]=-applied_at&limit=200&fields=application_id,job_id,user_id,application_status,applied_at`;
      const appRes = await fetch(appUrl, { headers: getHeaders(), cache: "no-store" });
      if (appRes.ok) {
        const appJson = await appRes.json();
        applicantsList = appJson.data ?? [];
      }
    }

    // 5. Fetch interviews
    let interviewsList: DirectusInterviewRecord[] = [];
    const interviewUrl = `${DIRECTUS_BASE}/items/vs_interview?filter[company_id][_eq]=${companyId}&sort[]=scheduled_at&limit=100&fields=*`;
    const interviewRes = await fetch(interviewUrl, { headers: getHeaders(), cache: "no-store" });
    if (interviewRes.ok) {
      const interviewJson = await interviewRes.json();
      interviewsList = interviewJson.data ?? [];
    }

    // Fetch interview application links if there are interviews
    const interviewIds = interviewsList.map((i) => i.interview_id);
    const interviewAppsMap: Record<number, number> = {}; // interview_id -> application_id
    const allInterviewAppIds: number[] = [];
    if (interviewIds.length > 0) {
      const iAppUrl = `${DIRECTUS_BASE}/items/vs_interview_application?filter[interview_id][_in]=${interviewIds.join(",")}&fields=interview_id,application_id&limit=100`;
      const iAppRes = await fetch(iAppUrl, { headers: getHeaders(), cache: "no-store" });
      if (iAppRes.ok) {
        const iAppJson = await iAppRes.json();
        const rows: DirectusInterviewAppRecord[] = iAppJson.data ?? [];
        rows.forEach((r) => {
          interviewAppsMap[r.interview_id] = r.application_id;
          if (r.application_id) allInterviewAppIds.push(r.application_id);
        });
      }
    }

    // Ensure all application records linked to interviews are present in applicantsList
    const missingAppIds = allInterviewAppIds.filter((appId) => !applicantsList.some((a) => a.application_id === appId));
    if (missingAppIds.length > 0) {
      const missingAppUrl = `${DIRECTUS_BASE}/items/vs_job_application?filter[application_id][_in]=${missingAppIds.join(",")}&fields=application_id,job_id,user_id,application_status,applied_at&limit=100`;
      const missingAppRes = await fetch(missingAppUrl, { headers: getHeaders(), cache: "no-store" });
      if (missingAppRes.ok) {
        const missingAppJson = await missingAppRes.json();
        const extraApps: ApplicationRecord[] = missingAppJson.data ?? [];
        applicantsList = [...applicantsList, ...extraApps];
      }
    }

    // Current local time
    const now = new Date();
    const nowMs = now.getTime();

    const parseScheduledDate = (scheduledAt?: string): Date => {
      if (!scheduledAt) return new Date(0);
      return new Date(scheduledAt.replace(" ", "T"));
    };

    const isActiveStatus = (st?: string) => {
      if (!st) return false;
      const s = st.toUpperCase();
      return s === "ACTIVE" || s === "PUBLISHED" || s === "OPEN";
    };

    const SCHEDULED_STATUSES = new Set(["SCHEDULED", "CONFIRMED", "RESCHEDULED"]);

    // 6. Compute Stats & Deltas
    const activeJobs = jobsList.filter((j) => isActiveStatus(j.status)).length;
    const totalJobs = jobsList.length;
    const totalApplicants = applicantsList.length;
    const shortlistedApplicants = applicantsList.filter((a) => a.application_status === "SHORTLISTED");
    const shortlistedCount = shortlistedApplicants.length;
    const hiredCount = applicantsList.filter((a) => a.application_status === "HIRED").length;
    const unreviewedApplicants = applicantsList.filter((a) => a.application_status === "APPLIED");

    // Strictly FUTURE interviews: scheduled_at >= nowMs AND status in SCHEDULED/CONFIRMED/RESCHEDULED
    const upcomingInterviews = interviewsList
      .filter((i) => {
        if (!SCHEDULED_STATUSES.has((i.interview_status || "").toUpperCase())) return false;
        const d = parseScheduledDate(i.scheduled_at);
        return !isNaN(d.getTime()) && d.getTime() >= nowMs;
      })
      .sort((a, b) => parseScheduledDate(a.scheduled_at).getTime() - parseScheduledDate(b.scheduled_at).getTime());

    const upcomingInterviewsCount = upcomingInterviews.length;

    // Past unresolved interviews: scheduled_at < nowMs AND status was never marked COMPLETED/CANCELLED/NO_SHOW
    const pastUnresolvedInterviews = interviewsList
      .filter((i) => {
        if (!SCHEDULED_STATUSES.has((i.interview_status || "").toUpperCase())) return false;
        const d = parseScheduledDate(i.scheduled_at);
        return !isNaN(d.getTime()) && d.getTime() < nowMs;
      })
      .sort((a, b) => parseScheduledDate(b.scheduled_at).getTime() - parseScheduledDate(a.scheduled_at).getTime());

    // Delta calculation for active jobs (e.g. posted this month)
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const jobsCreatedThisMonth = jobsList.filter((j) => j.created_at && new Date(j.created_at) >= oneMonthAgo).length;
    const shortlistedThisWeek = shortlistedApplicants.filter((a) => a.applied_at && new Date(a.applied_at) >= oneWeekAgo).length;

    // Next interview summary text for KPI card
    let nextInterviewSummary = "No upcoming interviews";
    if (upcomingInterviews.length > 0) {
      const nextInterview = upcomingInterviews[0];
      try {
        const schedDate = parseScheduledDate(nextInterview.scheduled_at);
        const isToday = schedDate.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = schedDate.toDateString() === tomorrow.toDateString();

        const timeStr = schedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        if (isToday) {
          nextInterviewSummary = `Today · ${timeStr}`;
        } else if (isTomorrow) {
          nextInterviewSummary = `Tomorrow · ${timeStr}`;
        } else {
          nextInterviewSummary = `Next: ${schedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`;
        }
      } catch {
        nextInterviewSummary = "Next: Upcoming";
      }
    }

    // Dynamic month-over-month applicant growth calculation
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    const applicantsThisMonth = applicantsList.filter(
      (a) => a.applied_at && new Date(a.applied_at.replace(" ", "T")) >= oneMonthAgo
    ).length;
    const applicantsPrevMonth = applicantsList.filter((a) => {
      if (!a.applied_at) return false;
      const d = new Date(a.applied_at.replace(" ", "T"));
      return d >= twoMonthsAgo && d < oneMonthAgo;
    }).length;

    let applicantsGrowthPercent: number | undefined = undefined;
    if (applicantsPrevMonth > 0) {
      applicantsGrowthPercent = Math.round(((applicantsThisMonth - applicantsPrevMonth) / applicantsPrevMonth) * 100);
    } else if (applicantsThisMonth > 0) {
      applicantsGrowthPercent = 100;
    }

    // 7. Time-series aggregation for Hiring Overview chart (7d, 30d, 3m, 6m)
    const chartData = generateChartData(applicantsList, shortlistedApplicants, upcomingInterviews, now);

    // 8. Job Performance List — Prioritize ACTIVE jobs first, sorted by applicant count
    const sortedJobsList = [...jobsList].sort((a, b) => {
      const aActive = isActiveStatus(a.status) ? 1 : 0;
      const bActive = isActiveStatus(b.status) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const aApps = applicantsList.filter((app) => app.job_id === a.job_id).length;
      const bApps = applicantsList.filter((app) => app.job_id === b.job_id).length;
      if (aApps !== bApps) return bApps - aApps;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const jobPerformance = sortedJobsList.map((j) => {
      const jobApps = applicantsList.filter((a) => a.job_id === j.job_id);
      const jobShortlisted = jobApps.filter((a) => a.application_status === "SHORTLISTED");
      return {
        id: j.job_id,
        job_id: j.job_id,
        title: j.job_title || "Untitled Job",
        job_title: j.job_title || "Untitled Job",
        department: j.job_department || "General",
        job_department: j.job_department || "General",
        location: j.job_location || "",
        job_location: j.job_location || "",
        applicantsCount: jobApps.length,
        applicants_count: jobApps.length,
        shortlistedCount: jobShortlisted.length,
        status: (j.status as "ACTIVE" | "DRAFT" | "CLOSED" | "PAUSED") || "ACTIVE",
        postedAt: j.created_at || new Date().toISOString(),
        created_at: j.created_at || new Date().toISOString(),
      };
    });

    // 9. Enrich Users & Candidates (Top Recent Applicants + All Interview Attendees)
    const topRecentApps = applicantsList.slice(0, 5);
    const interviewUserIds = allInterviewAppIds
      .map((appId) => applicantsList.find((a) => a.application_id === appId)?.user_id)
      .filter((uid): uid is number => Boolean(uid));

    const userIds = [...new Set([...topRecentApps.map((a) => a.user_id), ...interviewUserIds].filter(Boolean))];
    const usersMap: Record<number, VsUser> = {};
    const profilesMap: Record<number, { headline?: string; completion: number }> = {};

    if (userIds.length > 0) {
      const usersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_position,profile_image_url,profile_completion_percent&limit=50`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        const usersList: (VsUser & { profile_completion_percent?: number })[] = usersJson.data ?? [];
        usersList.forEach((u) => {
          usersMap[u.user_id] = u;
          if (u.profile_completion_percent) {
            profilesMap[u.user_id] = { completion: u.profile_completion_percent };
          }
        });
      }

      const profilesRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,profile_headline,profile_completion_percent&limit=50`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (profilesRes.ok) {
        const profilesJson = await profilesRes.json();
        const profilesList: (DirectusProfile & { profile_completion_percent?: number })[] = profilesJson.data ?? [];
        profilesList.forEach((p) => {
          profilesMap[p.user_id] = {
            headline: p.profile_headline || profilesMap[p.user_id]?.headline,
            completion: p.profile_completion_percent ?? profilesMap[p.user_id]?.completion ?? 0,
          };
        });
      }
    }

    const formattedRecentApplicants = topRecentApps.map((a) => {
      const u = usersMap[a.user_id];
      const name = u ? `${u.user_fname} ${u.user_lname}`.trim() : "Candidate";
      const profileInfo = profilesMap[a.user_id];
      const headline = profileInfo?.headline ?? u?.user_position ?? "Candidate Profile";
      const job = jobsList.find((j) => j.job_id === a.job_id);
      const matchScore = profileInfo?.completion && profileInfo.completion > 0 ? profileInfo.completion : 0;

      return {
        id: a.application_id,
        name,
        jobTitle: job?.job_title || "Open Position",
        email: u?.user_email || "",
        experience: headline,
        status: (a.application_status as "APPLIED" | "SHORTLISTED" | "INTERVIEWING" | "HIRED" | "REJECTED") || "APPLIED",
        appliedDate: a.applied_at || new Date().toISOString(),
        avatarUrl: formatAvatarUrl(u?.profile_image_url),
        matchScore,
      };
    });

    // 10. Format Upcoming Interviews Widget items (ONLY FUTURE INTERVIEWS)
    const formattedInterviews = upcomingInterviews.slice(0, 15).map((i) => {
      const appId = interviewAppsMap[i.interview_id];
      const app = applicantsList.find((a) => a.application_id === appId);
      const u = app ? usersMap[app.user_id] : null;
      const job = app ? jobsList.find((j) => j.job_id === app.job_id) : null;

      let displayDateGroup: "Today" | "Tomorrow" | "Upcoming" = "Upcoming";
      let dateLabel = "Upcoming";
      let dateKey = "";
      let displayTime = "TBD";

      try {
        const d = parseScheduledDate(i.scheduled_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        dateKey = `${yyyy}-${mm}-${dd}`;

        const isToday = d.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = d.toDateString() === tomorrow.toDateString();

        const monthName = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

        if (isToday) {
          displayDateGroup = "Today";
          dateLabel = `Today · ${monthName}`;
        } else if (isTomorrow) {
          displayDateGroup = "Tomorrow";
          dateLabel = `Tomorrow · ${monthName}`;
        } else {
          displayDateGroup = "Upcoming";
          dateLabel = `${weekday}, ${monthName}`;
        }

        displayTime = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      } catch {
        displayTime = i.scheduled_at;
        dateKey = (i.scheduled_at || "").split("T")[0] || (i.scheduled_at || "").split(" ")[0];
        dateLabel = dateKey;
      }

      return {
        id: i.interview_id,
        candidateName: u ? `${u.user_fname} ${u.user_lname}`.trim() : "Candidate",
        candidateAvatar: formatAvatarUrl(u?.profile_image_url),
        jobTitle: job?.job_title || "Interview Session",
        scheduledAt: i.scheduled_at,
        displayDateGroup,
        dateLabel,
        dateKey,
        displayTime,
        format: ((i.interview_format || "ONLINE").toUpperCase() as "ONLINE" | "IN_PERSON" | "PHONE"),
        meetingLink: i.meeting_link,
        status: i.interview_status,
      };
    });

    // 11. Compute Action Required Items
    const isVerified = companyData.verification_status === "VERIFIED";
    const actionsRequired = [];

    // Past unresolved interviews (Awaiting Outcome)
    if (pastUnresolvedInterviews.length > 0) {
      const sampleDescriptions = pastUnresolvedInterviews.slice(0, 2).map((iv) => {
        const appId = interviewAppsMap[iv.interview_id];
        const app = applicantsList.find((a) => a.application_id === appId);
        const u = app ? usersMap[app.user_id] : null;
        const candidateName = u ? `${u.user_fname} ${u.user_lname}`.trim() : "Candidate";
        let dateStr = "";
        try {
          dateStr = parseScheduledDate(iv.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } catch {
          dateStr = "Past date";
        }
        return `${dateStr} · ${candidateName}`;
      }).join(", ");

      actionsRequired.push({
        id: "awaiting_interview_outcomes",
        type: "interview_outcome_pending" as const,
        title: pastUnresolvedInterviews.length === 1
          ? "1 interview outcome pending"
          : `${pastUnresolvedInterviews.length} interviews need an outcome`,
        description: sampleDescriptions ? `Requires completion or attendance status: ${sampleDescriptions}` : "Interview time has passed without recorded outcome",
        count: pastUnresolvedInterviews.length,
        severity: "urgent" as const,
        actionLabel: "Mark Outcome",
        actionUrl: "/vos-sync/client/interviews?tab=awaiting_outcome",
        dismissible: false,
      });
    }

    if (unreviewedApplicants.length > 0) {
      const topJob = jobsList.find((j) => j.job_id === unreviewedApplicants[0].job_id);
      actionsRequired.push({
        id: "unreviewed_apps",
        type: "unreviewed_applicants" as const,
        title: `${unreviewedApplicants.length} new applicant${unreviewedApplicants.length > 1 ? "s" : ""} need review`,
        description: topJob?.job_title ? `Highest volume in: ${topJob.job_title}` : "Awaiting initial screening",
        count: unreviewedApplicants.length,
        severity: "urgent" as const,
        actionLabel: "Review Candidates",
        actionUrl: "/vos-sync/client/applicants?status=APPLIED",
        dismissible: false,
      });
    }

    if (upcomingInterviewsCount > 0) {
      actionsRequired.push({
        id: "interviews_awaiting",
        type: "interview_pending" as const,
        title: `${upcomingInterviewsCount} upcoming interview${upcomingInterviewsCount > 1 ? "s" : ""} scheduled`,
        description: nextInterviewSummary,
        count: upcomingInterviewsCount,
        severity: "warning" as const,
        actionLabel: "View Schedule",
        actionUrl: "/vos-sync/client/interviews",
        dismissible: false,
      });
    }

    if (activeJobs > 0) {
      actionsRequired.push({
        id: "active_jobs_review",
        type: "job_expiring" as const,
        title: `${activeJobs} active job posting${activeJobs > 1 ? "s" : ""} running`,
        description: "Monitor candidate pipelines and application intake",
        count: activeJobs,
        severity: "info" as const,
        actionLabel: "Manage Jobs",
        actionUrl: "/vos-sync/client/jobs",
        dismissible: true,
      });
    }

    if (isVerified) {
      actionsRequired.push({
        id: "profile_verified",
        type: "profile_verification" as const,
        title: "Company profile verified",
        description: "Full talent discovery and direct hiring privileges active",
        severity: "success" as const,
        actionLabel: "View Profile",
        actionUrl: "/vos-sync/client/company-profile",
        dismissible: true,
      });
    } else {
      actionsRequired.push({
        id: "profile_pending",
        type: "profile_verification" as const,
        title: "Company profile verification pending",
        description: "Submit complete documentation to unlock all hiring features",
        severity: "urgent" as const,
        actionLabel: "Complete Profile",
        actionUrl: "/vos-sync/client/company-profile",
        dismissible: false,
      });
    }

    return NextResponse.json({
      company: companyData,
      stats: {
        totalJobs,
        activeJobs,
        activeJobsDelta: jobsCreatedThisMonth > 0 ? `↑ ${jobsCreatedThisMonth} this month` : "Steady",
        totalApplicants,
        applicantsGrowthPercent,
        shortlistedCount,
        shortlistedWeeklyGrowth: shortlistedThisWeek > 0 ? `↑ ${shortlistedThisWeek} this week` : "Steady",
        upcomingInterviewsCount,
        nextInterviewSummary,
        hiredCount,
      },
      chartData,
      jobPerformance,
      recentJobs: jobPerformance,
      recentApplicants: formattedRecentApplicants,
      upcomingInterviews: formattedInterviews,
      actionsRequired,
    });
  } catch (error: unknown) {
    console.error("Dashboard API Route Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to generate 100% dynamic time-series bucketing from actual timestamps in PH Local Time
function generateChartData(
  applicants: ApplicationRecord[],
  shortlisted: ApplicationRecord[],
  interviews: DirectusInterviewRecord[],
  nowPh: Date
) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const parseDate = (dStr?: string) => {
    if (!dStr) return null;
    const d = new Date(dStr.replace(" ", "T"));
    return isNaN(d.getTime()) ? null : d;
  };

  // 1. Last 7 Days (day by day ending today)
  const last7d = [];
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(nowPh);
    targetDate.setDate(targetDate.getDate() - i);
    const dateKey = targetDate.toDateString();
    const dayLabel = targetDate.toLocaleDateString("en-US", { weekday: "short" });

    const appsOnDay = applicants.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d.toDateString() === dateKey;
    }).length;

    const shortlistedOnDay = shortlisted.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d.toDateString() === dateKey;
    }).length;

    const interviewsOnDay = interviews.filter((iv) => {
      const d = parseDate(iv.scheduled_at);
      return d && d.toDateString() === dateKey;
    }).length;

    last7d.push({
      label: dayLabel,
      applications: appsOnDay,
      shortlisted: shortlistedOnDay,
      interviews: interviewsOnDay,
    });
  }

  // 2. Last 30 Days (4 consecutive 7-day weekly intervals)
  const last30d = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(nowPh.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(nowPh.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const weekLabel = `W${4 - w}`;

    const appsInWeek = applicants.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d >= weekStart && d < weekEnd;
    }).length;

    const shortlistedInWeek = shortlisted.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d >= weekStart && d < weekEnd;
    }).length;

    const interviewsInWeek = interviews.filter((iv) => {
      const d = parseDate(iv.scheduled_at);
      return d && d >= weekStart && d < weekEnd;
    }).length;

    last30d.push({
      label: weekLabel,
      applications: appsInWeek,
      shortlisted: shortlistedInWeek,
      interviews: interviewsInWeek,
    });
  }

  // 3. Last 3 Months
  const last3m = [];
  for (let m = 2; m >= 0; m--) {
    const targetMonth = new Date(nowPh.getFullYear(), nowPh.getMonth() - m, 1);
    const nextMonth = new Date(nowPh.getFullYear(), nowPh.getMonth() - m + 1, 1);
    const monthLabel = months[targetMonth.getMonth()];

    const appsInMonth = applicants.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d >= targetMonth && d < nextMonth;
    }).length;

    const shortlistedInMonth = shortlisted.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d >= targetMonth && d < nextMonth;
    }).length;

    const interviewsInMonth = interviews.filter((iv) => {
      const d = parseDate(iv.scheduled_at);
      return d && d >= targetMonth && d < nextMonth;
    }).length;

    last3m.push({
      label: monthLabel,
      applications: appsInMonth,
      shortlisted: shortlistedInMonth,
      interviews: interviewsInMonth,
    });
  }

  // 4. Last 6 Months
  const last6m = [];
  for (let m = 5; m >= 0; m--) {
    const targetMonth = new Date(nowPh.getFullYear(), nowPh.getMonth() - m, 1);
    const nextMonth = new Date(nowPh.getFullYear(), nowPh.getMonth() - m + 1, 1);
    const monthLabel = months[targetMonth.getMonth()];

    const appsInMonth = applicants.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d >= targetMonth && d < nextMonth;
    }).length;

    const shortlistedInMonth = shortlisted.filter((a) => {
      const d = parseDate(a.applied_at);
      return d && d >= targetMonth && d < nextMonth;
    }).length;

    const interviewsInMonth = interviews.filter((iv) => {
      const d = parseDate(iv.scheduled_at);
      return d && d >= targetMonth && d < nextMonth;
    }).length;

    last6m.push({
      label: monthLabel,
      applications: appsInMonth,
      shortlisted: shortlistedInMonth,
      interviews: interviewsInMonth,
    });
  }

  return {
    "7d": last7d,
    "30d": last30d,
    "3m": last3m,
    "6m": last6m,
  };
}
