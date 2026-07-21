
// src/app/api/client/applicants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

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
      `${DIRECTUS_BASE}/items/vs_job_application/${id}`,
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

    let screeningAnswers = null;

    if (application.screening_answers) {
      try {
        screeningAnswers =
          typeof application.screening_answers === "string"
            ? JSON.parse(application.screening_answers)
            : application.screening_answers;
      } catch {
        screeningAnswers = application.screening_answers;
      }
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

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${id}`, {
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
