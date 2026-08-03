// src/app/api/client/talent-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";

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
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

function calcExperienceYears(workRows: { start_date?: string; end_date?: string; is_current_role?: boolean }[]): number {
  let totalMonths = 0;
  for (const exp of workRows) {
    if (!exp.start_date) continue;
    const start = new Date(exp.start_date);
    const end = exp.is_current_role ? new Date() : exp.end_date ? new Date(exp.end_date) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalMonths += Math.max(months, 0);
  }
  return Number((totalMonths / 12).toFixed(1));
}

/**
 * Compute AI match score against a job_id or keyword.
 * Weights: Skills 40%, Experience 25%, Education 15%, Location 10%, Availability 10%
 */
function computeMatchScore(
  params: {
    skillsRequested: string[];
    candidateSkills: string[];
    requiredExperienceYears: number;
    candidateExperienceYears: number;
    requiredLocation: string;
    candidateLocation: string;
    availability: string;
    profileVisibility: string;
  }
): number {
  const { skillsRequested, candidateSkills, requiredExperienceYears, candidateExperienceYears, requiredLocation, candidateLocation, availability } = params;

  // Skills match (40%)
  let skillScore = 0;
  if (skillsRequested.length > 0) {
    const lowerCandidateSkills = candidateSkills.map((s) => s.toLowerCase());
    const matched = skillsRequested.filter((s) => lowerCandidateSkills.includes(s.toLowerCase())).length;
    skillScore = Math.min(matched / skillsRequested.length, 1) * 40;
  } else {
    skillScore = candidateSkills.length > 0 ? 30 : 15;
  }

  // Experience match (25%)
  let expScore = 0;
  if (requiredExperienceYears > 0) {
    const ratio = Math.min(candidateExperienceYears / requiredExperienceYears, 1.2);
    expScore = Math.min(ratio, 1) * 25;
  } else {
    expScore = candidateExperienceYears > 0 ? 20 : 10;
  }

  // Education (15%) — always full since we don't have required degree here
  const educationScore = 15;

  // Location (10%)
  let locationScore = 0;
  if (!requiredLocation || requiredLocation.toLowerCase() === "remote") {
    locationScore = 10;
  } else if (candidateLocation && candidateLocation.toLowerCase().includes(requiredLocation.toLowerCase())) {
    locationScore = 10;
  } else {
    locationScore = 5;
  }

  // Availability (10%)
  let availScore = 0;
  if (availability === "AVAILABLE" || availability === "IMMEDIATELY_AVAILABLE") {
    availScore = 10;
  } else if (availability === "OPEN") {
    availScore = 7;
  } else {
    availScore = 3;
  }

  const total = skillScore + expScore + educationScore + locationScore + availScore;
  return Math.round(Math.min(total, 100));
}

export async function GET(req: NextRequest) {
  try {
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

    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json(
        {
          error: `Restricted: Your company verification status is ${verification_status}. Talent Search is only available to verified companies.`,
          verification_status,
          talents: [],
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const keyword = (searchParams.get("keyword") || "").trim().toLowerCase();
    const skillsParam = searchParams.get("skills") || "";
    const location = (searchParams.get("location") || "").trim();
    const experienceLevel = searchParams.get("experience_level") || "";
    const availability = searchParams.get("availability") || "";
    const schoolId = searchParams.get("school_id") || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
    const jobIdForMatch = searchParams.get("job_id") || "";

    const requestedSkills = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // ────────────────────────────────────────────
    // 1. Fetch all public job seeker profiles
    // ────────────────────────────────────────────
    const profilesUrl =
      `${DIRECTUS_BASE}/items/vs_job_seeker_profile?` +
      `filter[profile_visibility][_eq]=Public` +
      `&fields=profile_id,user_id,profile_headline,professional_summary,profile_visibility` +
      `&limit=-1`;

    const profilesRes = await fetch(profilesUrl, { headers: getHeaders(), cache: "no-store" });
    if (!profilesRes.ok) {
      return NextResponse.json({ error: "Failed to load talent profiles." }, { status: 502 });
    }

    const profilesJson = await profilesRes.json();
    const profiles: Array<{
      profile_id: number;
      user_id: number;
      profile_headline?: string;
      professional_summary?: string;
    }> = profilesJson.data ?? [];

    if (profiles.length === 0) {
      return NextResponse.json({ talents: [], total: 0, page, limit });
    }

    const profileUserIds = profiles.map((p) => p.user_id);

    // ────────────────────────────────────────────
    // 2. Bulk fetch associated data in parallel
    // ────────────────────────────────────────────
    const [usersRes, skillsRes, workRes, eduRes, savedRes, jobRes] = await Promise.all([
      // vs_user — basic info + location
      fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_contact,user_city,user_province,profile_image_url,gender&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_user_skills_map — skills
      fetch(
        `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,skill_id.skill_name&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_work_experience
      fetch(
        `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,company_name,job_title,start_date,end_date,is_current_role,employment_type,location&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_employee_education with school join
      fetch(
        `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,school_id.school_name,school_id.school_id,school_course_id.course_name,start_date,end_date&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_saved_talent — which of these are already saved by this company
      companyId
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_saved_talent?filter[company_id][_eq]=${companyId}&fields=talent_user_id&limit=-1`,
            { headers: getHeaders(), cache: "no-store" }
          )
        : Promise.resolve(null),
      // vs_job_posting — if job_id provided for AI match
      jobIdForMatch
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_eq]=${jobIdForMatch}&fields=job_id,job_title,job_location,experience_level&limit=1`,
            { headers: getHeaders(), cache: "no-store" }
          )
        : Promise.resolve(null),
    ]);

    const users: Array<{
      user_id: number;
      user_fname: string;
      user_lname: string;
      user_email: string;
      user_city?: string;
      user_province?: string;
      profile_image_url?: string;
    }> = usersRes.ok ? (await usersRes.json()).data ?? [] : [];

    const skillRows: Array<{ user_id: number; skill_id?: { skill_name?: string } }> =
      skillsRes.ok ? (await skillsRes.json()).data ?? [] : [];

    const workRows: Array<{
      user_id: number;
      company_name: string;
      job_title: string;
      start_date?: string;
      end_date?: string;
      is_current_role?: boolean;
      employment_type?: string;
      location?: string;
    }> = workRes.ok ? (await workRes.json()).data ?? [] : [];

    const eduRows: Array<{
      user_id: number;
      school_id?: { school_name?: string; school_id?: number };
      school_course_id?: { course_name?: string };
      start_date?: string;
      end_date?: string;
    }> = eduRes.ok ? (await eduRes.json()).data ?? [] : [];

    const savedUserIds = new Set<number>();
    if (savedRes && savedRes.ok) {
      const savedJson = await savedRes.json();
      (savedJson.data ?? []).forEach((s: { talent_user_id: number }) => savedUserIds.add(s.talent_user_id));
    }

    // Job for AI match
    let jobData: { job_title?: string; job_location?: string; experience_level?: string } | null = null;
    if (jobRes && jobRes.ok) {
      const jobJson = await jobRes.json();
      jobData = jobJson.data?.[0] ?? null;
    }

    // Job skills for AI match
    let jobSkills: string[] = [];
    if (jobIdForMatch) {
      const jsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_skills_map?filter[job_id][_eq]=${jobIdForMatch}&fields=skill_id.skill_name&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (jsRes.ok) {
        const jsJson = await jsRes.json();
        jobSkills = (jsJson.data ?? [])
          .map((r: { skill_id?: { skill_name?: string } }) => r.skill_id?.skill_name ?? "")
          .filter(Boolean);
      }
    }

    // ────────────────────────────────────────────
    // 3. Build lookup maps
    // ────────────────────────────────────────────
    const usersMap = new Map(users.map((u) => [u.user_id, u]));

    const skillsMap = new Map<number, string[]>();
    for (const row of skillRows) {
      const name = row.skill_id?.skill_name;
      if (!name) continue;
      if (!skillsMap.has(row.user_id)) skillsMap.set(row.user_id, []);
      skillsMap.get(row.user_id)!.push(name);
    }

    const workMap = new Map<number, typeof workRows>();
    for (const row of workRows) {
      if (!workMap.has(row.user_id)) workMap.set(row.user_id, []);
      workMap.get(row.user_id)!.push(row);
    }

    const eduMap = new Map<number, typeof eduRows>();
    for (const row of eduRows) {
      if (!eduMap.has(row.user_id)) eduMap.set(row.user_id, []);
      eduMap.get(row.user_id)!.push(row);
    }

    // ────────────────────────────────────────────
    // 4. Build talent records + apply filters
    // ────────────────────────────────────────────
    const expLevelRange: Record<string, [number, number]> = {
      ENTRY: [0, 2],
      JUNIOR: [0, 3],
      MID: [2, 6],
      SENIOR: [5, 99],
      MANAGER: [7, 99],
      EXECUTIVE: [10, 99],
    };

    const requiredExpYears = jobData?.experience_level
      ? (expLevelRange[jobData.experience_level.toUpperCase()]?.[0] ?? 0)
      : 0;

    interface TalentResult {
      user_id: number;
      profile_id: number;
      name: string;
      email: string;
      profile_image_url: string | null;
      headline: string | null;
      summary: string | null;
      location: string;
      skills: string[];
      experience_years: number;
      work_experience: Array<{
        company_name: string;
        job_title: string;
        start_date: string | null;
        end_date: string | null;
        is_current_role: boolean;
        employment_type: string | null;
      }>;
      education: Array<{
        school_name: string | null;
        school_id: number | null;
        course_name: string | null;
        start_date: string | null;
        end_date: string | null;
      }>;
      availability_status: string;
      is_saved: boolean;
      match_score: number;
    }

    const allTalents: TalentResult[] = profiles
      .map((profile) => {
        const user = usersMap.get(profile.user_id);
        if (!user) return null;

        const skills = skillsMap.get(profile.user_id) ?? [];
        const work = workMap.get(profile.user_id) ?? [];
        const edu = eduMap.get(profile.user_id) ?? [];
        const experienceYears = calcExperienceYears(work);
        const location = [user.user_city, user.user_province].filter(Boolean).join(", ");

        const currentRole = work.find((w) => w.is_current_role);
        const availabilityStatus = currentRole ? "EMPLOYED" : "AVAILABLE";

        // Compute match score
        const matchScore = computeMatchScore({
          skillsRequested: jobIdForMatch ? jobSkills : requestedSkills,
          candidateSkills: skills,
          requiredExperienceYears: requiredExpYears,
          candidateExperienceYears: experienceYears,
          requiredLocation: jobData?.job_location ?? location,
          candidateLocation: location,
          availability: availabilityStatus,
          profileVisibility: "Public",
        });

        return {
          user_id: profile.user_id,
          profile_id: profile.profile_id,
          name: `${user.user_fname} ${user.user_lname}`.trim(),
          email: user.user_email,
          profile_image_url: user.profile_image_url ?? null,
          headline: profile.profile_headline ?? currentRole?.job_title ?? null,
          summary: profile.professional_summary ?? null,
          location,
          skills,
          experience_years: experienceYears,
          work_experience: work.slice(0, 3).map((w) => ({
            company_name: w.company_name,
            job_title: w.job_title,
            start_date: w.start_date ?? null,
            end_date: w.end_date ?? null,
            is_current_role: w.is_current_role ?? false,
            employment_type: w.employment_type ?? null,
          })),
          education: edu.slice(0, 2).map((e) => ({
            school_name: e.school_id?.school_name ?? null,
            school_id: e.school_id?.school_id ?? null,
            course_name: e.school_course_id?.course_name ?? null,
            start_date: e.start_date ?? null,
            end_date: e.end_date ?? null,
          })),
          availability_status: availabilityStatus,
          is_saved: savedUserIds.has(profile.user_id),
          match_score: matchScore,
        } satisfies TalentResult;
      })
      .filter((t): t is TalentResult => t !== null);

    // ────────────────────────────────────────────
    // 5. Post-fetch filtering
    // ────────────────────────────────────────────
    let filtered = allTalents;

    if (keyword) {
      filtered = filtered.filter((t) => {
        const haystack = [
          t.name,
          t.headline,
          t.summary,
          ...t.skills,
          ...t.work_experience.map((w) => `${w.job_title} ${w.company_name}`),
          ...t.education.map((e) => `${e.school_name} ${e.course_name}`),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      });
    }

    if (requestedSkills.length > 0 && !jobIdForMatch) {
      filtered = filtered.filter((t) => {
        const lowerSkills = t.skills.map((s: string) => s.toLowerCase());
        return requestedSkills.some((rs) => lowerSkills.includes(rs.toLowerCase()));
      });
    }

    if (location) {
      filtered = filtered.filter((t) =>
        t.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (experienceLevel) {
      const [minYears, maxYears] = expLevelRange[experienceLevel.toUpperCase()] ?? [0, 99];
      filtered = filtered.filter(
        (t) => t.experience_years >= minYears && t.experience_years <= maxYears
      );
    }

    if (availability) {
      filtered = filtered.filter((t) => t.availability_status === availability.toUpperCase());
    }

    if (schoolId) {
      filtered = filtered.filter((t) =>
        t.education.some((e) => String(e.school_id) === String(schoolId))
      );
    }

    // Sort by match score desc
    filtered.sort((a, b) => b.match_score - a.match_score);

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ talents: paginated, total, page, limit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[talent-search] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
