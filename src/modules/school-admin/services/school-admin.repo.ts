import { VsSchoolAdmin, VsSchool, VsSchoolCourse, SchoolWithStats } from '../types/school-admin.types';

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

export async function fetchSchoolByUserIdRepo(userId: number): Promise<SchoolWithStats | null> {
  // First, find the school assigned to this user
  const adminUrl = `${DIRECTUS_BASE}/items/vs_school_admin?filter[user_id][_eq]=${userId}&filter[is_active][_eq]=true`;
  const adminRes = await fetch(adminUrl, { headers: getHeaders(), cache: "no-store" });
  if (!adminRes.ok) return null;
  const adminJson = await adminRes.json();
  const adminRecord: VsSchoolAdmin | undefined = adminJson.data?.[0];
  
  if (!adminRecord || !adminRecord.school_id) return null;

  // Then fetch the actual school
  const schoolUrl = `${DIRECTUS_BASE}/items/vs_school/${adminRecord.school_id}?fields=*`;
  const schoolRes = await fetch(schoolUrl, { headers: getHeaders(), cache: "no-store" });
  if (!schoolRes.ok) return null;
  const schoolJson = await schoolRes.json();
  
  if (!schoolJson.data) return null;
  
  // Calculate course count accurately
  let course_count = 0;
  try {
    const courses = await fetchCoursesBySchoolIdRepo(adminRecord.school_id);
    course_count = courses.length;
  } catch (err) {
    console.error("Failed to fetch course count", err);
  }

  return {
    ...schoolJson.data,
    course_count: course_count,
    student_count: 0
  };
}

export async function fetchCoursesBySchoolIdRepo(schoolId: number): Promise<VsSchoolCourse[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_eq]=${schoolId}&sort[]=-created_at`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch school courses.");
  const json = await res.json();
  return json.data || [];
}

export async function updateSchoolRepo(schoolId: number, payload: Partial<VsSchool>): Promise<VsSchool> {
  const url = `${DIRECTUS_BASE}/items/vs_school/${schoolId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to update school.");
  return json.data;
}

export async function createCourseRepo(payload: Partial<VsSchoolCourse>): Promise<VsSchoolCourse> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to create course.");
  return json.data;
}

export async function updateCourseRepo(courseId: number, payload: Partial<VsSchoolCourse>): Promise<VsSchoolCourse> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course/${courseId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to update course.");
  return json.data;
}
