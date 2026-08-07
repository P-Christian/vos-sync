// src/app/api/client/talent-profile/[id]/route.ts

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const talentUserId = Number(id);

    if (!talentUserId || isNaN(talentUserId)) {
      return NextResponse.json({ error: "Invalid talent ID." }, { status: 400 });
    }

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
          error: `Restricted: Your company is ${verification_status}. Viewing talent profiles requires company verification.`,
          verification_status,
        },
        { status: 403 }
      );
    }

    // ────────────────────────────────────────────
    // Parallel fetch: all profile data
    // ────────────────────────────────────────────
    const [userRes, profileRes, skillsRes, workRes, workSkillsRes, eduRes, certRes, socialRes, savedRes] =
      await Promise.all([
        // Basic user info
        fetch(
          `${DIRECTUS_BASE}/items/vs_user/${talentUserId}?fields=user_id,user_fname,user_lname,user_email,user_contact,user_city,user_province,user_brgy,profile_image_url,gender,nationality`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Job seeker profile
        fetch(
          `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_eq]=${talentUserId}&fields=profile_id,profile_headline,professional_summary,profile_visibility,expected_salary&limit=1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Skills
        fetch(
          `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_eq]=${talentUserId}&fields=id,skill_id.id,skill_id.skill_name&limit=-1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Work experience
        fetch(
          `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_eq]=${talentUserId}&fields=id,company_name,job_title,location,location_type,employment_type,start_date,end_date,is_current_role,job_description&sort[]=-start_date&limit=-1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Work experience skills
        fetch(
          `${DIRECTUS_BASE}/items/vs_work_experience_skills?fields=experience_id,skill_id.skill_name&limit=-1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Education
        fetch(
          `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_eq]=${talentUserId}&fields=employee_education_id,school_id.school_name,school_id.city_municipality,school_id.province,school_course_id.course_name,start_date,end_date&limit=-1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Certifications
        fetch(
          `${DIRECTUS_BASE}/items/vs_certifications?filter[user_id][_eq]=${talentUserId}&fields=id,certificate_name,issuing_organization,issue_date,credential_url&limit=-1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Social links
        fetch(
          `${DIRECTUS_BASE}/items/vs_user_social_links?filter[user_id][_eq]=${talentUserId}&fields=id,platform_name,profile_url&limit=-1`,
          { headers: getHeaders(), cache: "no-store" }
        ),
        // Is saved?
        companyId
          ? fetch(
              `${DIRECTUS_BASE}/items/vs_saved_applicant?filter[company_id][_eq]=${companyId}&filter[applicant_user_id][_eq]=${talentUserId}&fields=saved_applicant_id,notes&limit=1`,
              { headers: getHeaders(), cache: "no-store" }
            )
          : Promise.resolve(null),
      ]);

    if (!userRes.ok) {
      return NextResponse.json({ error: "Talent not found." }, { status: 404 });
    }

    const userData = (await userRes.json()).data;
    if (!userData) {
      return NextResponse.json({ error: "Talent not found." }, { status: 404 });
    }

    const profileData = profileRes.ok ? (await profileRes.json()).data?.[0] ?? null : null;

    // Only return public profiles
    if (profileData && profileData.profile_visibility !== "Public") {
      return NextResponse.json({ error: "This profile is not publicly visible." }, { status: 403 });
    }

    const skillsData: Array<{ skill_id?: { skill_name?: string } }> =
      skillsRes.ok ? (await skillsRes.json()).data ?? [] : [];

    const workData: Array<{
      id: number;
      company_name: string;
      job_title: string;
      location?: string;
      location_type?: string;
      employment_type?: string;
      start_date?: string;
      end_date?: string;
      is_current_role?: boolean;
      job_description?: string;
    }> = workRes.ok ? (await workRes.json()).data ?? [] : [];

    const workSkillsData: Array<{ experience_id: number; skill_id?: { skill_name?: string } }> =
      workSkillsRes.ok ? (await workSkillsRes.json()).data ?? [] : [];

    // Work experience skill map
    const workSkillMap = new Map<number, string[]>();
    for (const row of workSkillsData) {
      const name = row.skill_id?.skill_name;
      if (!name) continue;
      if (!workSkillMap.has(row.experience_id)) workSkillMap.set(row.experience_id, []);
      workSkillMap.get(row.experience_id)!.push(name);
    }

    const eduData: Array<{
      employee_education_id: number;
      school_id?: { school_name?: string; city_municipality?: string; province?: string };
      school_course_id?: { course_name?: string };
      start_date?: string;
      end_date?: string;
    }> = eduRes.ok ? (await eduRes.json()).data ?? [] : [];

    const certData: Array<{
      id: number;
      certificate_name: string;
      issuing_organization: string;
      issue_date?: string;
      credential_url?: string;
    }> = certRes.ok ? (await certRes.json()).data ?? [] : [];

    const socialData: Array<{ id: number; platform_name: string; profile_url: string }> =
      socialRes.ok ? (await socialRes.json()).data ?? [] : [];

    // Resumes — only return URLs if company is VERIFIED (already confirmed above)
    const resumesRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_seeker_resumes?filter[user_id][_eq]=${talentUserId}&fields=id,file_url,file_name,is_primary,uploaded_at&sort[]=-is_primary&limit=10`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const resumeData: Array<{ id: number; file_url: string; file_name?: string; is_primary: boolean; uploaded_at?: string }> =
      resumesRes.ok ? (await resumesRes.json()).data ?? [] : [];

    // Saved status
    let isSaved = false;
    let savedNotes: string | null = null;
    if (savedRes && savedRes.ok) {
      const savedJson = await savedRes.json();
      const savedRecord = savedJson.data?.[0];
      if (savedRecord) {
        isSaved = true;
        savedNotes = savedRecord.notes ?? null;
      }
    }

    const location = [userData.user_city, userData.user_province].filter(Boolean).join(", ");
    const skills = skillsData
      .map((s) => s.skill_id?.skill_name)
      .filter(Boolean) as string[];

    const experienceYears = (() => {
      let totalMonths = 0;
      for (const exp of workData) {
        if (!exp.start_date) continue;
        const start = new Date(exp.start_date);
        const end = exp.is_current_role ? new Date() : exp.end_date ? new Date(exp.end_date) : new Date();
        totalMonths += Math.max((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()), 0);
      }
      return Number((totalMonths / 12).toFixed(1));
    })();

    const currentRole = workData.find((w) => w.is_current_role);
    const availabilityStatus: "AVAILABLE" | "EMPLOYED" | "OPEN" | "IMMEDIATELY_AVAILABLE" =
      currentRole ? "EMPLOYED" : "AVAILABLE";

    const profile = {
      user_id: userData.user_id,
      name: `${userData.user_fname} ${userData.user_lname}`.trim(),
      email: userData.user_email,
      phone: userData.user_contact ?? null,
      profile_image_url: userData.profile_image_url ?? null,
      gender: userData.gender ?? null,
      nationality: userData.nationality ?? null,
      location,
      headline: profileData?.profile_headline ?? null,
      summary: profileData?.professional_summary ?? null,
      expected_salary: profileData?.expected_salary ?? null,
      profile_visibility: profileData?.profile_visibility ?? "Public",
      availability_status: availabilityStatus,
      skills,
      experience_years: experienceYears,
      work_experience: workData.map((w) => ({
        id: w.id,
        company_name: w.company_name,
        job_title: w.job_title,
        location: w.location ?? null,
        location_type: w.location_type ?? null,
        employment_type: w.employment_type ?? null,
        start_date: w.start_date ?? null,
        end_date: w.end_date ?? null,
        is_current_role: w.is_current_role ?? false,
        description: w.job_description ?? null,
        skills: workSkillMap.get(w.id) ?? [],
      })),
      education: eduData.map((e) => ({
        id: e.employee_education_id,
        school_name: e.school_id?.school_name ?? null,
        school_location: [e.school_id?.city_municipality, e.school_id?.province].filter(Boolean).join(", ") || null,
        course_name: e.school_course_id?.course_name ?? null,
        start_date: e.start_date ?? null,
        end_date: e.end_date ?? null,
      })),
      certifications: certData.map((c) => ({
        id: c.id,
        certificate_name: c.certificate_name,
        issuing_organization: c.issuing_organization,
        issue_date: c.issue_date ?? null,
        credential_url: c.credential_url ?? null,
      })),
      social_links: socialData.map((s) => ({
        id: s.id,
        platform_name: s.platform_name,
        profile_url: s.profile_url,
      })),
      // Resumes only visible to VERIFIED companies (isVerified already confirmed)
      resumes: resumeData.map((r) => ({
        id: r.id,
        file_url: r.file_url,
        file_name: r.file_name ?? null,
        is_primary: r.is_primary,
        uploaded_at: r.uploaded_at ?? null,
      })),
      is_saved: isSaved,
      saved_notes: savedNotes,
    };

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[talent-profile] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
