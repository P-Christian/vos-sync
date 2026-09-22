// src/app/api/client/campus-talent/schools/[id]/students/route.ts
// GET: Fetch students for a specific school, resolving registered user profiles.

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { AcademicCandidate, EnhancedCandidate } from "@/modules/matching-engine/campus/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
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
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { isVerified, verification_status } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json(
        { error: `Restricted: Company status is ${verification_status}.` },
        { status: 403 }
      );
    }

    const { id } = await params;
    const schoolId = Number(id);
    if (!schoolId || isNaN(schoolId)) {
      return NextResponse.json({ error: "Invalid school ID." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";
    const courseFilter = searchParams.get("course_id") || "";

    // Fetch school info for context
    const schoolRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_school/${schoolId}?fields=school_id,school_name,verification_status,is_active`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!schoolRes.ok) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }
    const schoolData = (await schoolRes.json()).data;
    if (!schoolData?.is_active || schoolData?.verification_status !== "VERIFIED") {
      return NextResponse.json({ error: "School is not accessible." }, { status: 403 });
    }

    // Fetch student roster
    const studentFilters: string[] = [`filter[school_id][_eq]=${schoolId}`];
    if (courseFilter) studentFilters.push(`filter[school_course_id][_eq]=${courseFilter}`);
    if (search) {
      studentFilters.push(`filter[_or][0][first_name][_icontains]=${encodeURIComponent(search)}`);
      studentFilters.push(`filter[_or][1][last_name][_icontains]=${encodeURIComponent(search)}`);
      studentFilters.push(`filter[_or][2][email][_icontains]=${encodeURIComponent(search)}`);
    }

    const studentFields = [
      "student_id",
      "student_number",
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "school_year",
      "gpa",
      "invitation_status",
      "invited_at",
      "registered_user_id",
      "school_course_id.school_course_id",
      "school_course_id.course_name",
      "school_course_id.course_code",
      "school_course_id.degree",
    ].join(",");

    const studentsUrl = `${DIRECTUS_BASE}/items/vs_school_student?${studentFilters.join("&")}&fields=${studentFields}&sort[]=last_name&limit=200`;
    const studentsRes = await fetch(studentsUrl, { headers: getHeaders(), cache: "no-store" });
    if (!studentsRes.ok) throw new Error("Failed to fetch students.");

    const rawStudents = ((await studentsRes.json()).data ?? []) as Array<Record<string, unknown>>;

    // Resolve registered user profiles for students with registered_user_id
    const registeredUserIds = rawStudents
      .filter((s) => s.registered_user_id)
      .map((s) => s.registered_user_id as number);

    type SkillRow = { skill_id: { skill_name: string } };
    type SkillMap = Record<number, string[]>;
    type ProfileMap = Record<number, { profile_headline: string | null; professional_summary: string | null }>;
    type ExpMap = Record<number, number>;
    type ResumeMap = Record<number, boolean>;

    let skillMap: SkillMap = {};
    let profileMap: ProfileMap = {};
    let expMap: ExpMap = {};
    let resumeMap: ResumeMap = {};

    if (registeredUserIds.length > 0) {
      const userIdFilter = registeredUserIds.map((id) => `filter[user_id][_in][]=${id}`).join("&");

      const [skillsRes, profilesRes, expRes, resumeRes] = await Promise.all([
        fetch(`${DIRECTUS_BASE}/items/vs_user_skills_map?${userIdFilter}&fields=user_id,skill_id.skill_name&limit=500`, { headers: getHeaders(), cache: "no-store" }),
        fetch(`${DIRECTUS_BASE}/items/vs_job_seeker_profile?${userIdFilter}&fields=user_id,profile_headline,professional_summary&limit=500`, { headers: getHeaders(), cache: "no-store" }),
        fetch(`${DIRECTUS_BASE}/items/vs_work_experience?${userIdFilter}&fields=user_id,start_date,end_date,is_current_role&limit=500`, { headers: getHeaders(), cache: "no-store" }),
        fetch(`${DIRECTUS_BASE}/items/vs_job_seeker_resumes?${userIdFilter}&fields=user_id&limit=10`, { headers: getHeaders(), cache: "no-store" }),
      ]);

      if (skillsRes.ok) {
        const rawSkills = ((await skillsRes.json()).data ?? []) as Array<{ user_id: number } & SkillRow>;
        for (const row of rawSkills) {
          if (!skillMap[row.user_id]) skillMap[row.user_id] = [];
          if (row.skill_id?.skill_name) skillMap[row.user_id].push(row.skill_id.skill_name);
        }
      }

      if (profilesRes.ok) {
        const rawProfiles = ((await profilesRes.json()).data ?? []) as Array<{ user_id: number; profile_headline: string | null; professional_summary: string | null }>;
        for (const row of rawProfiles) {
          profileMap[row.user_id] = { profile_headline: row.profile_headline, professional_summary: row.professional_summary };
        }
      }

      if (expRes.ok) {
        const rawExp = ((await expRes.json()).data ?? []) as Array<{ user_id: number; start_date: string; end_date: string | null; is_current_role: number }>;
        for (const row of rawExp) {
          const start = new Date(row.start_date).getFullYear();
          const end = row.is_current_role ? new Date().getFullYear() : row.end_date ? new Date(row.end_date).getFullYear() : start;
          expMap[row.user_id] = (expMap[row.user_id] ?? 0) + (end - start);
        }
      }

      if (resumeRes.ok) {
        const rawResumes = ((await resumeRes.json()).data ?? []) as Array<{ user_id: number }>;
        for (const row of rawResumes) {
          resumeMap[row.user_id] = true;
        }
      }
    }

    const candidates: (AcademicCandidate | EnhancedCandidate)[] = rawStudents.map((s) => {
      const courseObj = s.school_course_id as Record<string, unknown> | null;
      const courseName = courseObj ? String(courseObj.course_name ?? "") : null;
      const courseCode = courseObj ? String(courseObj.course_code ?? "") : null;
      const degree = courseObj?.degree as "Associate" | "Bachelor" | "Master" | "Doctorate" | null ?? null;
      const registeredUserId = s.registered_user_id ? Number(s.registered_user_id) : null;

      const base = {
        studentId: Number(s.student_id),
        studentNumber: s.student_number ? String(s.student_number) : null,
        firstName: String(s.first_name ?? ""),
        middleName: s.middle_name ? String(s.middle_name) : null,
        lastName: String(s.last_name ?? ""),
        email: String(s.email ?? ""),
        schoolId,
        schoolName: String(schoolData.school_name ?? ""),
        courseName,
        courseCode,
        degree,
        schoolYear: String(s.school_year ?? ""),
        gpa: s.gpa !== null && s.gpa !== undefined ? Number(s.gpa) : null,
        invitationStatus: String(s.invitation_status ?? "Not Sent"),
      };

      if (!registeredUserId) {
        return { ...base, isRegistered: false as const, registeredUserId: null };
      }

      return {
        ...base,
        isRegistered: true as const,
        registeredUserId,
        profileHeadline: profileMap[registeredUserId]?.profile_headline ?? null,
        professionalSummary: profileMap[registeredUserId]?.professional_summary ?? null,
        verifiedSkills: skillMap[registeredUserId] ?? [],
        workExperienceYears: expMap[registeredUserId] ?? 0,
        hasResume: resumeMap[registeredUserId] ?? false,
        certifications: [],
      };
    });

    return NextResponse.json({
      schoolId,
      schoolName: schoolData.school_name,
      data: candidates,
      total: candidates.length,
      registeredCount: candidates.filter((c) => c.isRegistered).length,
    });
  } catch (err: unknown) {
    console.error("[campus-talent/schools/[id]/students GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
