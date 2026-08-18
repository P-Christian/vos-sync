
import { NextRequest, NextResponse } from "next/server";
import { sendShortlistedEmail, sendHiringEmail, sendRejectionEmail, isEmailEnabledForUser } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { createNotification } from "@/lib/notifications";
import { createEmployerNotification } from "@/lib/notifications/services/employer-notifications";
import { getPHTimeString } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
interface WorkExperience {
  id: number;
  company_name?: string | null;
  job_title?: string | null;
  location?: string | null;
  location_type?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current_role?: boolean | number | null;
  job_description?: string | null;
}

interface Resume {
  id: number;
  is_primary?: boolean | null;
  file_path?: string | null;
  file_url?: string | null;
  url?: string | null;
  file_id?: string | number | null;
  file?: string | number | null;
  file_name?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

interface SocialLinkItem {
  id: number;
  platform_name?: string | null;
  platform?: string | null;
  profile_url?: string | null;
  url?: string | null;
  link?: string | null;
}

interface SkillMap {
  id: number;
  skill_id: number;
}

interface Skill {
  skill_name: string;
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
  } catch { return null; }
}

const VALID_STATUSES = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEWING",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

import { checkCompanyVerificationStatus } from "@/lib/status-validator";

// GET — Retrieve details profile for a single job seeker application
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const requesterId = getUserIdFromToken(token);

    if (!requesterId) {
      return NextResponse.json(
        { error: "Invalid token." },
        { status: 401 }
      );
    }

    // BUSINESS RULE: Only VERIFIED companies can view candidate details
    const { isVerified, verification_status } = await checkCompanyVerificationStatus(requesterId);
    if (!isVerified) {
      return NextResponse.json(
        {
          error: `Restricted: Your company verification status is currently ${verification_status}. Viewing candidate details is restricted until your company is verified by an admin.`,
          verification_status,
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------
    // APPLICATION
    // ---------------------------------------------------

    const applicationRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application/${id}?fields=application_id,job_id,user_id,application_status,cover_letter,expected_salary,portfolio_url,client_notes,applied_at,status_updated_at`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (!applicationRes.ok) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    const applicationJson = await applicationRes.json();

    const application = applicationJson.data;

    if (!application) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }

    const applicantUserId = application.user_id;

    // ---------------------------------------------------
    // AUTO-TRANSITION: APPLIED -> UNDER_REVIEW ON VIEW
    // ---------------------------------------------------
    if (application.application_status === "APPLIED") {
      const nowPH = getPHTimeString();
      application.application_status = "UNDER_REVIEW";
      application.status_updated_at = nowPH;

      fetch(`${DIRECTUS_BASE}/items/vs_job_application/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          application_status: "UNDER_REVIEW",
          status_updated_at: nowPH,
        }),
      }).catch((e) => console.error("Error auto-updating status to UNDER_REVIEW:", e));

      if (applicantUserId) {
        createNotification({
          event_type: "application_status_changed",
          recipient_user_id: applicantUserId,
          entity_type: "job_application",
          entity_id: Number(id),
          category: "Application Updates",
          title: "Application Status Updated",
          message: "Your application is now under review by the employer.",
          action_url: "/vos-sync/freelancer/applications",
        }).catch((e) => console.error("Error sending review notification:", e));
      }
    }

    // ---------------------------------------------------
    // PARALLEL REQUESTS
    // ---------------------------------------------------

    const [
      userRes,
      profileRes,
      jobRes,
      workRes,
      educationRes,
      certificationRes,
      resumeRes,
      socialRes,
      skillsMapRes,
      interviewAppRes,
    ] = await Promise.all([
      fetch(
        `${DIRECTUS_BASE}/items/vs_user/${applicantUserId}`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_eq]=${applicantUserId}&limit=1`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_job_posting/${application.job_id}?fields=job_title,company_id`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_eq]=${applicantUserId}&sort[]=-start_date`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_eq]=${applicantUserId}&fields=*`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_certifications?filter[user_id][_eq]=${applicantUserId}`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[user_id][_eq]=${applicantUserId}`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_user_social_links?filter[user_id][_eq]=${applicantUserId}`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_eq]=${applicantUserId}&fields=id,skill_id`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_interview_application?filter[application_id][_eq]=${application.application_id}&fields=interview_id&limit=50`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),
    ]);
    // ---------------------------------------------------
    // USER
    // ---------------------------------------------------

    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Candidate profile not found." },
        { status: 404 }
      );
    }

    const userJson = await userRes.json();

    const user = userJson.data;

    // ---------------------------------------------------
    // PROFILE
    // ---------------------------------------------------

    const profileJson = profileRes.ok
      ? await profileRes.json()
      : { data: [] };

    const profile = profileJson.data?.[0] ?? null;

    // ---------------------------------------------------
    // JOB + COMPANY
    // ---------------------------------------------------

    const jobJson = jobRes.ok
      ? await jobRes.json()
      : { data: null };

    const job = jobJson.data;

    const jobTitle =
      job?.job_title ?? "Unknown Role";


    let company = null;


    if (job?.company_id) {
      const companyRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company/${job.company_id}`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      );


      if (companyRes.ok) {
        const companyJson = await companyRes.json();

        company = companyJson.data ?? null;
      }
    }
    // ---------------------------------------------------
    // WORK EXPERIENCE
    // ---------------------------------------------------

    const workJson = workRes.ok
      ? await workRes.json()
      : { data: [] };

    const workExperience = (workJson.data as WorkExperience[] ?? []).map((exp) => ({
      id: exp.id,
      company_name: exp.company_name,
      job_title: exp.job_title,
      location: exp.location,
      location_type: exp.location_type,
      employment_type: exp.employment_type,
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_current_role: !!exp.is_current_role,
      job_description: exp.job_description,
    }));

    // ---------------------------------------------------
    // EDUCATION
    // ---------------------------------------------------

    const educationJson = educationRes.ok
      ? await educationRes.json()
      : { data: [] };

    const education = educationJson.data?.[0] ?? null;

    // ---------------------------------------------------
    // CERTIFICATIONS
    // ---------------------------------------------------

    const certificationJson = certificationRes.ok
      ? await certificationRes.json()
      : { data: [] };

    const certifications = certificationJson.data ?? [];

    // ---------------------------------------------------
    // RESUME
    // ---------------------------------------------------

    const resumeJson = resumeRes.ok
      ? await resumeRes.json()
      : { data: [] };

    const resumes = (resumeJson.data as Resume[] ?? []).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

    const latestResumes = resumes.slice(0, 1);

    const formattedResumes = latestResumes.map((r) => {
      const rawAsset = r.file_url || r.file_id || r.file || r.file_path || r.url || "";
      let file_url = "";

      if (typeof rawAsset === "string" && rawAsset.trim()) {
        const trimmed = rawAsset.trim();
        if (trimmed.includes("/assets/")) {
          const match = trimmed.match(/\/assets\/([a-zA-Z0-9-]+)/);
          file_url = match?.[1] ? `/api/assets/${match[1]}` : trimmed;
        } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/api/")) {
          file_url = trimmed;
        } else {
          file_url = `/api/assets/${trimmed}`;
        }
      }

      return {
        id: r.id,
        file_name: r.file_name || r.name || "Resume.pdf",
        file_url,
      };
    });

    const primaryResume =
      resumes.find((r) => r.is_primary) ||
      resumes[0] ||
      null;

    // ---------------------------------------------------
    // SOCIAL LINKS
    // ---------------------------------------------------

    const socialJson = socialRes.ok
      ? await socialRes.json()
      : { data: [] };

    const rawSocials = (socialJson.data as SocialLinkItem[] ?? []);
    const socialLinks = rawSocials.map((s) => {
      const linkUrl = s.profile_url || s.url || s.link || "";
      const platformName = s.platform_name || s.platform || "Link";
      return {
        id: s.id,
        platform: platformName,
        platform_name: platformName,
        profile_url: linkUrl,
        url: linkUrl,
      };
    });

    // ---------------------------------------------------
    // SKILLS
    // ---------------------------------------------------

    const skillsMapJson = skillsMapRes.ok
      ? await skillsMapRes.json()
      : { data: [] };

    const skillsMap = skillsMapJson.data ?? [];

    let skills: string[] = [];

    if (skillsMap.length > 0) {
const skillIds = (skillsMap as SkillMap[])
  .map((s) => s.skill_id)
  .filter(Boolean);

      if (skillIds.length > 0) {
        const skillsRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_master_skills?filter[id][_in]=${skillIds.join(",")}&fields=skill_name`,
          {
            headers: getHeaders(),
            cache: "no-store",
          }
        );

        if (skillsRes.ok) {
          const skillsJson = await skillsRes.json();

skills = (skillsJson.data as Skill[] ?? []).map(
  (s) => s.skill_name
);
        }
      }
    }

    // ---------------------------------------------------
    // SCREENING ANSWERS
    // ---------------------------------------------------

    let screeningAnswers: { question_id: number; question_text: string; answer_text: string }[] | null = null;
    
    // 1. Fetch all configured screening questions for this job
    const jobQuestionsRes = application.job_id
      ? await fetch(
          `${DIRECTUS_BASE}/items/vs_job_screening_question?filter[job_id][_eq]=${application.job_id}&fields=question_id,question_text&limit=100`,
          { headers: getHeaders(), cache: "no-store" }
        )
      : null;

    const jobQuestions: { question_id: number; question_text: string }[] =
      jobQuestionsRes && jobQuestionsRes.ok ? (await jobQuestionsRes.json()).data ?? [] : [];

    // 2. Fetch candidate answers submitted for this application
    const ansRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application_answer?filter[application_id][_eq]=${application.application_id}&fields=question_id,answer_text&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (ansRes.ok || jobQuestions.length > 0) {
      const ansList: { question_id: number; answer_text: string }[] = ansRes.ok
        ? (await ansRes.json()).data ?? []
        : [];
      const ansMap = new Map<number, string>();
      ansList.forEach((a) => {
        if (a.question_id) ansMap.set(a.question_id, a.answer_text);
      });

      if (jobQuestions.length > 0) {
        // Map all job questions, including unanswered ones with empty string
        screeningAnswers = jobQuestions.map((q) => ({
          question_id: q.question_id,
          question_text: q.question_text || `Question #${q.question_id}`,
          answer_text: ansMap.get(q.question_id) ?? "",
        }));
      } else if (ansList.length > 0) {
        // Fallback if questions are recorded with answers
        const qIds = [...new Set(ansList.map((a) => a.question_id).filter(Boolean))];
        const qTextMap: Record<number, string> = {};
        if (qIds.length > 0) {
          const qRes = await fetch(
            `${DIRECTUS_BASE}/items/vs_job_screening_question?filter[question_id][_in]=${qIds.join(",")}&fields=question_id,question_text&limit=100`,
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

        screeningAnswers = ansList.map((a) => ({
          question_id: a.question_id,
          question_text: qTextMap[a.question_id] || `Question #${a.question_id}`,
          answer_text: a.answer_text ?? "",
        }));
      } else {
        screeningAnswers = [];
      }
    }

    // ---------------------------------------------------
    // ACTIVE INTERVIEW
    // ---------------------------------------------------
    let activeInterviewId: number | null = null;
    const interviewAppRows: { interview_id: number }[] =
      interviewAppRes.ok ? (await interviewAppRes.json()).data ?? [] : [];
    const ivIds = interviewAppRows.map((r) => r.interview_id).filter(Boolean);
    if (ivIds.length > 0) {
      const activeIvRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_interview?filter[interview_id][_in]=${ivIds.join(",")}&filter[interview_status][_in]=SCHEDULED,CONFIRMED,RESCHEDULED&fields=interview_id,interview_status&limit=1`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (activeIvRes.ok) {
        const activeIvRows: { interview_id: number }[] =
          (await activeIvRes.json()).data ?? [];
        if (activeIvRows.length > 0) {
          activeInterviewId = activeIvRows[0].interview_id;
        }
      }
    }

    const portfolioFromSocials = socialLinks.find(
      (s) => s.platform_name?.toLowerCase().includes("portfolio") || s.platform?.toLowerCase().includes("portfolio")
    )?.profile_url;

    const resolvedPortfolioUrl = application.portfolio_url?.trim() || portfolioFromSocials?.trim() || null;

    const applicant = {
      application_id: application.application_id,
      job_id: application.job_id,
      user_id: application.user_id,

      company,

      application_status: application.application_status,

      applicant_name:
        `${user.user_fname} ${user.user_lname}`.trim(),

      applicant_email: user.user_email,

      applicant_phone: user.user_contact,

      profile_image: user.profile_image_url,

      location:
        [user.user_city, user.user_province]
          .filter(Boolean)
          .join(", ") || null,

      job_title: jobTitle,

      profile_headline: profile?.profile_headline ?? null,

      professional_summary:
        profile?.professional_summary ?? null,

      cover_letter: application.cover_letter,

      portfolio_url: resolvedPortfolioUrl,

      expected_salary: application.expected_salary
        ? Number(application.expected_salary)
        : null,

      screening_answers: screeningAnswers,

      client_notes: application.client_notes,

      applied_at: application.applied_at,

      status_updated_at:
        application.status_updated_at,

      resume: primaryResume,

      resumes: formattedResumes,

      skills,

      social_links: socialLinks,

      education,

      certifications,

      work_experience: workExperience,

      active_interview_id: activeInterviewId,
    };
 
    return NextResponse.json({
      success: true,
      applicant,
    });
  } catch (err: unknown) {
    console.error(
      "GET /api/client/applicants/[id] error:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

// PATCH — Update application status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    const body = await req.json().catch(() => null);

    if (!body?.application_status) {
      return NextResponse.json(
        { error: "application_status is required." },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(body.application_status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const nowPH = getPHTimeString();

    const payload: Record<string, unknown> = {
      application_status: body.application_status,
      status_updated_at: nowPH,
    };

    if (body.client_notes !== undefined) payload.client_notes = body.client_notes;

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${id}?fields=application_id,application_status,status_updated_at,client_notes,user_id`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to update application status." },
        { status: res.status }
      );
    }

    // Fetch application details to resolve candidate, job, and company for notifications
    try {
      const appRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${id}?fields=application_id,user_id,job_id`, {
        headers: getHeaders(),
        cache: "no-store",
      });

      if (appRes.ok) {
        const appData = (await appRes.json()).data;
        const jobseekerId = appData?.user_id || json.data?.user_id;

        let jobTitle = "the position";
        let companyName = "the company";
        let companyId: number | null = null;

        if (appData?.job_id) {
          const jobRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${appData.job_id}?fields=job_title,company_id`, {
            headers: getHeaders(),
            cache: "no-store",
          });
          if (jobRes.ok) {
            const jData = (await jobRes.json()).data;
            if (jData?.job_title) jobTitle = jData.job_title;
            if (jData?.company_id) {
              companyId = Number(jData.company_id);
              const compRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${jData.company_id}?fields=company_name`, {
                headers: getHeaders(),
                cache: "no-store",
              });
              if (compRes.ok) {
                companyName = (await compRes.json()).data?.company_name || companyName;
              }
            }
          }
        }

        // 1. Single dynamic notification for the candidate (Jobseeker)
        if (jobseekerId) {
          let candidateTitle = "Application Status Updated";
          let candidateMessage = `Your application status for "${jobTitle}" has been updated.`;

          if (body.application_status === "UNDER_REVIEW") {
            candidateTitle = "Application Under Review";
            candidateMessage = `Your application for "${jobTitle}" at ${companyName} is now under review.`;
          } else if (body.application_status === "SHORTLISTED") {
            candidateTitle = "Application Shortlisted";
            candidateMessage = `You have been shortlisted for "${jobTitle}" at ${companyName}!`;
          } else if (body.application_status === "HIRED") {
            candidateTitle = "Application Selected";
            candidateMessage = `Congratulations! You have been selected for "${jobTitle}" at ${companyName}.`;
          } else if (body.application_status === "REJECTED") {
            candidateTitle = "Application Status Update";
            candidateMessage = `Your application for "${jobTitle}" at ${companyName} was not selected.`;
          } else if (body.application_status === "INTERVIEWING") {
            candidateTitle = "Application in Interview Stage";
            candidateMessage = `Your application for "${jobTitle}" at ${companyName} has moved to the interview stage.`;
          }

          await createNotification({
            event_type: "application_status_changed",
            recipient_user_id: jobseekerId,
            entity_type: "job_application",
            entity_id: Number(id),
            category: "APPLICATION_STATUS_UPDATED",
            title: candidateTitle,
            message: candidateMessage,
            action_url: "/vos-sync/freelancer/applications",
          }).catch((err) => console.error("[Candidate Notification] Error:", err));
        }

        // 2. Team Activity: Notify OTHER team members in the company (suppress for the acting recruiter)
        const requestingEmployerId = token ? getUserIdFromToken(token) : null;
        if (companyId && requestingEmployerId && ["SHORTLISTED", "HIRED", "REJECTED", "UNDER_REVIEW"].includes(body.application_status)) {
          const teamUsersRes = await fetch(
            `${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_eq]=${companyId}&filter[user_id][_neq]=${requestingEmployerId}&fields=user_id`,
            { headers: getHeaders(), cache: "no-store" }
          );

          if (teamUsersRes.ok) {
            const teamMembers: { user_id: number }[] = (await teamUsersRes.json()).data ?? [];
            const statusLabel =
              body.application_status === "SHORTLISTED" ? "shortlisted a candidate" :
              body.application_status === "HIRED" ? "hired a candidate" :
              body.application_status === "REJECTED" ? "rejected a candidate" :
              "moved a candidate to review";

            for (const member of teamMembers) {
              await createEmployerNotification({
                event_type: "TEAM_ACTIVITY",
                recipient_user_id: member.user_id,
                entity_type: "job_application",
                entity_id: Number(id),
                category: "TEAM_ACTIVITY",
                title: "Team Activity",
                message: `A team member ${statusLabel} for "${jobTitle}".`,
                action_url: `/vos-sync/client/applicants/${id}`,
              }).catch((err) => console.error("[Team Activity Notification] Error:", err));
            }
          }
        }
      }
    } catch (notifyErr) {
      console.error("[Applicant Status Notification] Error:", notifyErr);
    }

    // Fetch application details to resolve candidate & job for email notification
    try {
      const appRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${id}?fields=application_id,user_id,job_id`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      if (appRes.ok) {
        const appData = (await appRes.json()).data;
        if (appData?.user_id) {
          const userRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${appData.user_id}?fields=user_email,user_fname,user_lname`, {
            headers: getHeaders(),
            cache: "no-store",
          });
          if (userRes.ok) {
            const candidate = (await userRes.json()).data;
            if (candidate?.user_email) {
              let jobTitle = "Unknown Position";
              let companyName = "Employer";

              if (appData.job_id) {
                const jobRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${appData.job_id}?fields=job_title,company_id`, {
                  headers: getHeaders(),
                  cache: "no-store",
                });
                if (jobRes.ok) {
                  const jData = (await jobRes.json()).data;
                  if (jData?.job_title) jobTitle = jData.job_title;
                  if (jData?.company_id) {
                    const compRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${jData.company_id}?fields=company_name`, {
                      headers: getHeaders(),
                      cache: "no-store",
                    });
                    if (compRes.ok) {
                      companyName = (await compRes.json()).data?.company_name || companyName;
                    }
                  }
                }
              }

              const candidateName = `${candidate.user_fname} ${candidate.user_lname}`.trim();
              const notes = typeof body.client_notes === "string" ? body.client_notes : null;

              const statusEmailEnabled = await isEmailEnabledForUser(appData.user_id, "APPLICATION_STATUS_UPDATED");
              if (statusEmailEnabled) {
                if (body.application_status === "SHORTLISTED") {
                  await sendShortlistedEmail(candidate.user_email, {
                    candidateName,
                    companyName,
                    jobTitle,
                  }).catch((e) => console.error("Shortlisted mail error:", e));
                } else if (body.application_status === "HIRED") {
                  await sendHiringEmail(candidate.user_email, {
                    candidateName,
                    companyName,
                    jobTitle,
                    notes,
                  }).catch((e) => console.error("Hiring mail error:", e));
                } else if (body.application_status === "REJECTED") {
                  await sendRejectionEmail(candidate.user_email, {
                    candidateName,
                    companyName,
                    jobTitle,
                    notes,
                  }).catch((e) => console.error("Rejection mail error:", e));
                }
              }

              // Create System Message for Conversation
              const requesterId = token ? getUserIdFromToken(token) : null;
              if (requesterId && appData.user_id) {
                const systemText =
                  body.application_status === "HIRED"
                    ? "Client hired you."
                    : `Application status changed: ${body.application_status}`;

                const statusEventType =
                  body.application_status === "HIRED"
                    ? "HIRED"
                    : "APPLICATION_STATUS_CHANGED";

                await createSystemMessage({
                  clientId: requesterId,
                  freelancerId: appData.user_id,
                  jobId: appData.job_id ?? null,
                  text: systemText,
                  senderId: requesterId,
                  systemEventType: statusEventType,
                  applicationId: appData.application_id ?? null,
                }).catch((e) => console.error("Status change system message error:", e));
              }
            }
          }
        }
      }
    } catch (mailErr) {
      console.error("Error dispatching status update email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Application status updated to ${body.application_status}.`,
      application: json.data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
