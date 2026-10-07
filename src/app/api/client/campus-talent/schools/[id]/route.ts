// src/app/api/client/campus-talent/schools/[id]/route.ts
// GET: Fetch school profile details for Campus Talent client view.

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { PublicSchoolAdminProfile } from "@/modules/public/public-profile/services/public-profile.service";

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

function resolveAssetUrl(fileId?: string | null): string | null {
  if (!fileId || typeof fileId !== "string" || !fileId.trim()) return null;
  const t = fileId.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/api/assets/")) return t;
  if (t.startsWith("/assets/")) return `/api${t}`;
  const parts = t.split("/");
  const lastPart = parts[parts.length - 1];
  return lastPart ? `/api/assets/${lastPart}` : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_sync_access_token")?.value;

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

    // 1. Fetch school details
    const schoolRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_school/${schoolId}?fields=*`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!schoolRes.ok) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }
    const school = (await schoolRes.json()).data;
    if (!school?.is_active || school?.verification_status !== "VERIFIED") {
      return NextResponse.json({ error: "School is not accessible." }, { status: 403 });
    }

    // 2. Fetch courses, student count, and admin in parallel
    const [coursesRes, studentCountRes, adminRes] = await Promise.all([
      fetch(
        `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_eq]=${schoolId}&filter[course_status][_eq]=Active&fields=school_course_id,course_name,course_code,degree,course_status&sort[]=course_name`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      fetch(
        `${DIRECTUS_BASE}/items/vs_school_student?filter[school_id][_eq]=${schoolId}&aggregate[count]=student_id`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      fetch(
        `${DIRECTUS_BASE}/items/vs_school_admin?filter[school_id][_eq]=${schoolId}&filter[is_active][_eq]=1&fields=user_id.user_id,user_id.user_fname,user_id.user_lname,user_id.user_email,user_id.profile_image_url&limit=1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
    ]);

    const coursesJson = coursesRes.ok ? await coursesRes.json() : { data: [] };
    const courses = (coursesJson.data ?? []) as Array<{
      school_course_id: number;
      course_name: string;
      course_code?: string | null;
      degree?: string | null;
      course_status?: string;
    }>;

    const studentCount = studentCountRes.ok
      ? ((await studentCountRes.json()).data?.[0]?.count?.student_id ?? 0)
      : 0;

    let adminUser: {
      user_id?: number;
      user_fname?: string;
      user_lname?: string;
      user_email?: string;
      profile_image_url?: string | null;
    } | null = null;

    if (adminRes.ok) {
      const adminJson = await adminRes.json();
      const rawUser = adminJson.data?.[0]?.user_id;
      if (rawUser && typeof rawUser === "object") {
        adminUser = rawUser;
      }
    }

    const addressParts = [
      school.address_line,
      school.barangay,
      school.city_municipality,
      school.province,
      school.postal_code,
      school.country,
    ].filter(Boolean);

    const profile: PublicSchoolAdminProfile = {
      user_id: adminUser?.user_id ?? 0,
      user_fname: adminUser?.user_fname ?? "",
      user_lname: adminUser?.user_lname ?? "",
      user_email: adminUser?.user_email ?? (school.school_email || ""),
      avatar_url: resolveAssetUrl(adminUser?.profile_image_url) ?? undefined,
      headline: school.school_name,
      school_id: school.school_id,
      school_name: school.school_name,
      school_type: school.school_type || "University",
      school_logo_url: resolveAssetUrl(school.school_logo_url),
      school_cover: resolveAssetUrl(school.school_cover),
      school_description: school.school_description || null,
      school_mission: school.school_mission || null,
      school_values: school.school_values || null,
      school_email: school.school_email || null,
      school_contact_no: school.school_contact_no || null,
      school_website: school.school_website || null,
      school_address: addressParts.join(", "),
      course_count: courses.length,
      student_count: Number(studentCount),
      courses: courses.map((c) => ({
        school_course_id: c.school_course_id,
        course_name: c.course_name,
        course_code: c.course_code,
        course_status: c.course_status,
      })),
      social_links: {
        facebook: school.school_facebook || null,
        linkedin: school.school_linkedin || null,
      },
    };

    return NextResponse.json({ data: profile });
  } catch (err: unknown) {
    console.error("[campus-talent/schools/[id] GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
