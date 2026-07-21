
// src/app/api/client/applicants/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }

  return headers;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");

    if (parts.length < 2) {
      return null;
    }

    const b64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded =
      b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8")
    );

    const id =
      payload?.user_id ??
      payload?.sub ??
      payload?.id ??
      null;

    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

async function getCompanyId(
  userId: number
): Promise<number | null> {
  const res = await fetch(
    `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  const json = await res.json();

  return json.data?.[0]?.company_id ?? null;
}

interface RawApplication {
  application_id: number;
  job_id: number;
  user_id: number;
  application_status: string;
  client_notes?: string | null;
  applied_at?: string;
  status_updated_at?: string;
}

interface VsUser {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_position?: string | null;
   profile_image_url?: string | null;
}

interface SkillMap {
  user_id: number;
  skill_id?: {
    skill_name?: string;
  };
}

interface Resume {
  user_id: number;
}

interface WorkExperience {
  user_id: number;
  start_date?: string;
  end_date?: string;
  is_current_role?: boolean;
}
interface Job {
  job_id: number;
  job_title: string;
  company_id: number;
}

interface Company {
  company_id: number;
  company_name: string;
  company_logo?: string | null;
  company_cover?: string | null;
}
async function getCompanyNames(
  companyIds: number[]
): Promise<Record<number, Company>> {

  const result: Record<number, Company> = {};

  if (!companyIds.length) {
    return result;
  }

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=company_id,company_name,company_logo,company_cover&limit=200`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return result;
    }

    const json = await res.json();

    (json.data ?? []).forEach((company: Company) => {
      result[company.company_id] = company;
    });

  } catch (err) {
    console.error(
      "Error fetching companies:",
      err
    );
  }

  return result;
}
function calculateExperienceYears(
  workExperience: WorkExperience[]
): number {
  if (!workExperience.length) {
    return 0;
  }

  let totalMonths = 0;

  for (const exp of workExperience) {
    if (!exp.start_date) {
      continue;
    }

    const start = new Date(exp.start_date);

    const end = exp.is_current_role
      ? new Date()
      : exp.end_date
        ? new Date(exp.end_date)
        : new Date();

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    totalMonths += Math.max(months, 0);
  }

  return Number((totalMonths / 12).toFixed(1));
}

function calculateProfileCompletion(
  user: VsUser | undefined,
  skills: string[],
  experienceCount: number,
  resumeCount: number
): number {
  let score = 0;

  if (user?.user_fname) score += 20;
  if (user?.user_email) score += 20;
  if (skills.length > 0) score += 20;
  if (experienceCount > 0) score += 20;
  if (resumeCount > 0) score += 20;

  return score;
}

// GET — List all applicants for company jobs

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers
        .get("authorization")
        ?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token." },
        { status: 401 }
      );
    }

    const companyId = await getCompanyId(userId);

    if (!companyId) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const jobId = searchParams.get("job_id");

    // ------------------------------
    // Jobs
    // ------------------------------

    const jobsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${companyId}&fields=job_id,job_title,company_id&limit=500`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    const jobsJson = await jobsRes.json();
    const jobs: Job[] = jobsJson.data ?? [];
    const jobIds = jobs.map((job) => job.job_id);

    const companyIds = [
      ...new Set(
        jobs
          .map((job) => job.company_id)
          .filter(Boolean)
      ),
    ];

    const companiesMap = await getCompanyNames(companyIds);

    if (jobIds.length === 0) {
      return NextResponse.json({
        applicants: [],
      });
    }
    
    let filterQuery = `filter[job_id][_in]=${jobIds.join(",")}`;

    if (status && status !== "ALL") {
      filterQuery += `&filter[application_status][_eq]=${status}`;
    }

    if (jobId) {
      filterQuery += `&filter[job_id][_eq]=${jobId}`;
    }

    // ------------------------------
    // Applications
    // ------------------------------

    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?${filterQuery}&sort[]=-applied_at&fields=application_id,job_id,user_id,application_status,cover_letter,expected_salary,portfolio_url,client_notes,applied_at,status_updated_at&limit=500`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    const appJson = await appRes.json();

    const rawApps: RawApplication[] =
      appJson.data ?? [];

    if (!rawApps.length) {
      return NextResponse.json({
        applicants: [],
      });
    }

    const userIds = [
      ...new Set(
        rawApps
          .map((app) => app.user_id)
          .filter(Boolean)
      ),
    ];

    const appIds = rawApps.map((a) => a.application_id);

    // ------------------------------
    // Bulk fetch
    // ------------------------------

    const [
      usersRes,
      skillsRes,
      workRes,
      resumeRes,
      interviewsRes,
    ] = await Promise.all([
      fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_position,profile_image_url&limit=500`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,skill_id.skill_name&limit=1000`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,start_date,end_date,is_current_role&limit=1000`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[user_id][_in]=${userIds.join(",")}&fields=user_id&limit=1000`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),

      fetch(
        `${DIRECTUS_BASE}/items/vs_interview?filter[application_id][_in]=${appIds.join(",")}&filter[interview_status][_in]=SCHEDULED,CONFIRMED,RESCHEDULED&fields=interview_id,application_id&limit=500`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      ),
    ]);

    const users: VsUser[] =
      usersRes.ok
        ? (await usersRes.json()).data ?? []
        : [];

    const skillsRows: SkillMap[] =
      skillsRes.ok
        ? (await skillsRes.json()).data ?? []
        : [];

    const workRows: WorkExperience[] =
      workRes.ok
        ? (await workRes.json()).data ?? []
        : [];

    const resumeRows: Resume[] =
      resumeRes.ok
        ? (await resumeRes.json()).data ?? []
        : [];

    const interviewRows: { interview_id: number; application_id: number }[] =
      interviewsRes.ok
        ? (await interviewsRes.json()).data ?? []
        : [];
    
    // ------------------------------
    // Maps
    // ------------------------------

    const usersMap: Record<number, VsUser> = {};
    const jobsMap: Record<
      number,
      {
        title: string;
        company: Company | null;
      }
    > = {};

    const skillsMap: Record<number, string[]> = {};

    const workMap: Record<number, WorkExperience[]> = {};

    const resumeMap: Record<number, number> = {};

    const activeInterviewsMap: Record<number, number> = {};

    interviewRows.forEach((row) => {
      activeInterviewsMap[row.application_id] = row.interview_id;
    });

    users.forEach((user) => {
      usersMap[user.user_id] = user;
    });

    jobs.forEach((job) => {
      jobsMap[job.job_id] = {
        title: job.job_title,
        company:
          companiesMap[job.company_id] ?? null,
      };
    });

    skillsRows.forEach((row) => {
      if (!skillsMap[row.user_id]) {
        skillsMap[row.user_id] = [];
      }

      const skill = row.skill_id?.skill_name;

      if (skill) {
        skillsMap[row.user_id].push(skill);
      }
    });

    workRows.forEach((row) => {
      if (!workMap[row.user_id]) {
        workMap[row.user_id] = [];
      }

      workMap[row.user_id].push(row);
    });

    resumeRows.forEach((row) => {
      resumeMap[row.user_id] =
        (resumeMap[row.user_id] || 0) + 1;
    });

    // ------------------------------
    // Response
    // ------------------------------

    const applicants = rawApps.map((application) => {
      const user = usersMap[application.user_id];
      
      const skills =
        skillsMap[application.user_id] ?? [];

      const workExperience =
        workMap[application.user_id] ?? [];

      const resumeCount =
        resumeMap[application.user_id] ?? 0;

      return {
        ...application,

        applicant_name: user
          ? `${user.user_fname} ${user.user_lname}`.trim()
          : `Applicant #${application.user_id}`,

        applicant_email:
          user?.user_email ?? "",

        job_title:
          jobsMap[application.job_id]?.title ??
          "Unknown Role",
        
        applicant_profile_image_url: 
          user?.profile_image_url ?? "",
        
        company:
          jobsMap[application.job_id]?.company ??
          null,

        skills,

        experience_years:
          calculateExperienceYears(
            workExperience
          ),

        work_experience_count:
          workExperience.length,

        resume_count: resumeCount,

        profile_completion:
          calculateProfileCompletion(
            user,
            skills,
            workExperience.length,
            resumeCount
          ),

        active_interview_id:
          activeInterviewsMap[application.application_id] ?? null,
      };
    });


    return NextResponse.json({
      applicants,
      
    });

    
  } catch (err: unknown) {
    console.error(err);

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