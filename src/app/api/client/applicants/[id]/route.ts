
// src/app/api/client/applicants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendShortlistedEmail, sendHiringEmail, sendRejectionEmail } from "@/lib/mail";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { createNotification } from "@/lib/notifications";

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
  [key: string]: unknown;
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
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "HIRED",
  "REJECTED",
];

// GET — Retrieve details profile for a single job seeker application
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

    const resumes = resumeJson.data ?? [];

const primaryResume =
  (resumes as Resume[]).find((r) => r.is_primary) ||
  resumes[0] ||
  null;

    // ---------------------------------------------------
    // SOCIAL LINKS
    // ---------------------------------------------------

    const socialJson = socialRes.ok
      ? await socialRes.json()
      : { data: [] };

    const socialLinks = socialJson.data ?? [];

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
    const ansRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application_answer?filter[application_id][_eq]=${application.application_id}&fields=question_id,answer_text&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (ansRes.ok) {
      const ansJson = await ansRes.json();
      const ansList: { question_id: number; answer_text: string }[] = ansJson.data ?? [];
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
        answer_text: a.answer_text,
      }));
    }

    // ---------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------
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

      portfolio_url: application.portfolio_url,

      expected_salary: application.expected_salary
        ? Number(application.expected_salary)
        : null,

      screening_answers: screeningAnswers,

      client_notes: application.client_notes,

      applied_at: application.applied_at,

      status_updated_at:
        application.status_updated_at,

      resume: primaryResume,

      skills,

      social_links: socialLinks,

      education,

      certifications,

      work_experience: workExperience,
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

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const payload: Record<string, unknown> = {
      application_status: body.application_status,
      status_updated_at: nowPH,
    };

    if (body.client_notes !== undefined) payload.client_notes = body.client_notes;

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${id}?fields=application_id,application_status,status_updated_at,client_notes`, {
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

    // Trigger notification
    const jobseekerId = json.data?.user_id;
    if (jobseekerId) {
      await createNotification({
        event_type: "application_status_changed",
        recipient_user_id: jobseekerId,
        entity_type: "job_application",
        entity_id: Number(id),
        category: "Application Updates",
        title: "Application Status Updated",
        message: `Your application status has been updated to: ${body.application_status}.`,
        action_url: "/vos-sync/freelancer/applications",
      });
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

              // Create System Message for Conversation
              const requesterId = token ? getUserIdFromToken(token) : null;
              if (requesterId && appData.user_id) {
                const systemText =
                  body.application_status === "HIRED"
                    ? "Client hired you."
                    : `Application status changed: ${body.application_status}`;

                await createSystemMessage({
                  clientId: requesterId,
                  freelancerId: appData.user_id,
                  jobId: appData.job_id ?? null,
                  text: systemText,
                  senderId: requesterId,
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
