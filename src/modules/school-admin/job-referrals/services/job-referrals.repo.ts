// src/modules/school-admin/job-referrals/services/job-referrals.repo.ts
import {
  VsJobPosting,
  VsJobReferral,
  VsJobReferralHistory,
} from '../types/job-referrals.types';

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

export async function fetchActiveJobsRepo(): Promise<VsJobPosting[]> {
  const url = `${DIRECTUS_BASE}/items/vs_job_posting?filter[status][_eq]=ACTIVE&sort[]=-created_at&fields=*,company_id.company_name,company_id.company_logo&limit=100`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch active job postings: ${res.statusText}`);
  }
  const json = await res.json();
  const raw = json.data || [];

  return raw.map((item: Record<string, unknown>) => {
    let companyName: string | undefined = undefined;
    let companyLogo: string | undefined = undefined;

    if (item.company_id && typeof item.company_id === 'object') {
      const c = item.company_id as Record<string, unknown>;
      companyName = c.company_name ? String(c.company_name) : undefined;
      companyLogo = c.company_logo ? String(c.company_logo) : undefined;
    }

    return {
      ...item,
      company_name: companyName,
      company_logo: companyLogo,
    } as VsJobPosting;
  });
}

export async function fetchEligibleStudentsRepo(schoolId: number): Promise<Record<string, unknown>[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_student?filter[school_id][_eq]=${schoolId}&filter[invitation_status][_eq]=Registered&filter[registered_user_id][_nnull]=true&fields=*,school_course_id.school_course_id,school_course_id.course_name&limit=500`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch verified school students: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchFreelancerProfilesBatchRepo(userIds: number[]): Promise<Record<number, Record<string, unknown>>> {
  if (!userIds.length) return {};
  const joinedIds = userIds.join(',');

  // 1. Fetch Users
  const usersUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${joinedIds}&fields=user_id,user_email,user_fname,user_lname,profile_image_url,user_position,status&limit=500`;
  // 2. Fetch Job Seeker Profiles
  const profilesUrl = `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_in]=${joinedIds}&fields=*&limit=500`;
  // 3. Fetch Skills Map with joined master skills
  const skillsUrl = `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_in]=${joinedIds}&fields=*,skill_id.id,skill_id.skill_name&limit=2000`;
  // 4. Fetch Work Experiences
  const workUrl = `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_in]=${joinedIds}&fields=*&sort[]=-start_date&limit=1000`;
  // 5. Fetch Preferences
  const prefsUrl = `${DIRECTUS_BASE}/items/vs_job_preferences?filter[user_id][_in]=${joinedIds}&fields=*&limit=500`;
  // 6. Fetch Job Applications
  const appsUrl = `${DIRECTUS_BASE}/items/vs_job_application?filter[user_id][_in]=${joinedIds}&filter[application_status][_neq]=WITHDRAWN&fields=user_id,job_id&limit=2000`;

  const [usersRes, profilesRes, skillsRes, workRes, prefsRes, appsRes] = await Promise.all([
    fetch(usersUrl, { headers: getHeaders(), cache: "no-store" }),
    fetch(profilesUrl, { headers: getHeaders(), cache: "no-store" }),
    fetch(skillsUrl, { headers: getHeaders(), cache: "no-store" }),
    fetch(workUrl, { headers: getHeaders(), cache: "no-store" }),
    fetch(prefsUrl, { headers: getHeaders(), cache: "no-store" }),
    fetch(appsUrl, { headers: getHeaders(), cache: "no-store" }),
  ]);

  const [usersData, profilesData, skillsData, workData, prefsData, appsData] = await Promise.all([
    usersRes.ok ? (await usersRes.json()).data || [] : [],
    profilesRes.ok ? (await profilesRes.json()).data || [] : [],
    skillsRes.ok ? (await skillsRes.json()).data || [] : [],
    workRes.ok ? (await workRes.json()).data || [] : [],
    prefsRes.ok ? (await prefsRes.json()).data || [] : [],
    appsRes.ok ? (await appsRes.json()).data || [] : [],
  ]);

  const result: Record<number, Record<string, unknown>> = {};

  userIds.forEach((uid) => {
    const user = usersData.find((u: Record<string, unknown>) => Number(u.user_id) === uid) || {};
    const profile = profilesData.find((p: Record<string, unknown>) => Number(p.user_id) === uid) || {};
    const userSkills = skillsData
      .filter((s: Record<string, unknown>) => Number(s.user_id) === uid)
      .map((s: Record<string, unknown>) => {
        const sm = s.skill_id as Record<string, unknown> | undefined;
        return sm?.skill_name ? String(sm.skill_name) : '';
      })
      .filter(Boolean);

    const userWork = workData.filter((w: Record<string, unknown>) => Number(w.user_id) === uid);
    const userPref = prefsData.find((pr: Record<string, unknown>) => Number(pr.user_id) === uid) || null;
    const userApps = appsData
      .filter((a: Record<string, unknown>) => Number(a.user_id) === uid)
      .map((a: Record<string, unknown>) => {
        if (a.job_id && typeof a.job_id === 'object') {
          return Number((a.job_id as Record<string, unknown>).job_id);
        }
        return Number(a.job_id);
      })
      .filter((id: number) => !isNaN(id) && id > 0);

    result[uid] = {
      user,
      profile,
      skills: userSkills,
      work_experiences: userWork,
      job_preferences: userPref,
      applied_job_ids: userApps,
    };
  });

  return result;
}

export async function insertReferralsRepo(referrals: Partial<VsJobReferral>[]): Promise<VsJobReferral[]> {
  const url = `${DIRECTUS_BASE}/items/vs_job_referral`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(referrals),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to insert referral records: ${errText}`);
  }

  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [json.data];
}

export async function insertReferralHistoryBatchRepo(histories: Partial<VsJobReferralHistory>[]): Promise<void> {
  if (!histories.length) return;
  const url = `${DIRECTUS_BASE}/items/vs_job_referral_history`;
  await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(histories),
  });
}

export async function fetchReferralsByAdminRepo(adminUserId: number): Promise<VsJobReferral[]> {
  const url = `${DIRECTUS_BASE}/items/vs_job_referral?filter[referrer_user_id][_eq]=${adminUserId}&sort[]=-created_at&fields=*,job_id.job_title,job_id.company_id.company_name&limit=100`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  const raw = json.data || [];

  return raw.map((r: Record<string, unknown>) => {
    let jobTitle: string | undefined = undefined;
    let companyName: string | undefined = undefined;

    if (r.job_id && typeof r.job_id === 'object') {
      const job = r.job_id as Record<string, unknown>;
      jobTitle = job.job_title ? String(job.job_title) : undefined;
      if (job.company_id && typeof job.company_id === 'object') {
        const comp = job.company_id as Record<string, unknown>;
        companyName = comp.company_name ? String(comp.company_name) : undefined;
      }
    }

    return {
      ...r,
      job_title: jobTitle,
      company_name: companyName,
    } as VsJobReferral;
  });
}
