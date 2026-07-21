// src/modules/vos-admin/school-management/services/school.repo.ts
import { VsSchool, VsSchoolCourse, SchoolWithStats, VsSchoolAdminRecord } from '../types/school.types';

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

export async function fetchSchoolsRepo(status?: string, search?: string): Promise<SchoolWithStats[]> {
  let filterQuery = '';
  const filters: string[] = [];

  if (status && status !== 'ALL') {
    filters.push(`filter[school_status][_eq]=${status}`);
  }
  if (search) {
    filters.push(`filter[school_name][_icontains]=${encodeURIComponent(search)}`);
  }
  
  if (filters.length > 0) {
    filterQuery = '?' + filters.join('&');
  }

  // To get stats, we might need a custom query or fetch courses and students manually.
  // For the MVP, we can fetch all schools and their related courses/students counts if the API supports it,
  // or just fetch schools and mock counts for now, or fetch related items. Directus supports aggregate.
  // Using basic fetch for now. We will use fields=* to get basic fields.
  
  const url = `${DIRECTUS_BASE}/items/vs_school${filterQuery ? filterQuery + '&' : '?'}fields=*&sort=-created_at`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch schools from database.");
  const json = await res.json();
  const schools = json.data || [];

  // Fetch course counts grouped by school_id
  const courseCountUrl = `${DIRECTUS_BASE}/items/vs_school_course?aggregate[count]=*&groupBy[]=school_id`;
  const courseCountRes = await fetch(courseCountUrl, { headers: getHeaders(), cache: "no-store" });
  const courseCounts: Record<number, number> = {};
  if (courseCountRes.ok) {
    const ccJson = await courseCountRes.json();
    if (ccJson.data) {
      ccJson.data.forEach((item: { school_id?: number, count?: string | number }) => {
        if (item.school_id) courseCounts[item.school_id] = typeof item.count === 'string' ? parseInt(item.count, 10) : (item.count || 0);
      });
    }
  }

  return schools.map((school: VsSchool) => ({
    ...school,
    course_count: courseCounts[school.school_id] || 0, 
    student_count: 0,
  }));
}

export async function fetchSchoolByIdRepo(id: number): Promise<SchoolWithStats | null> {
  const url = `${DIRECTUS_BASE}/items/vs_school/${id}?fields=*`;
  console.log("Fetching school details from Directus:", url);
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    console.error("Directus returned not ok for school details:", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  if (!json.data) {
    console.error("Directus returned ok but no data for school details:", json);
    return null;
  }
  
  // Fetch actual course count
  const courseUrl = `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_eq]=${id}&aggregate[count]=*`;
  const courseRes = await fetch(courseUrl, { headers: getHeaders(), cache: "no-store" });
  let courseCount = 0;
  if (courseRes.ok) {
    const cJson = await courseRes.json();
    courseCount = parseInt(cJson.data?.[0]?.count || 0, 10);
  }

  return {
    ...json.data,
    course_count: courseCount,
    student_count: 0
  };
}

export async function fetchCoursesBySchoolRepo(schoolId: number): Promise<VsSchoolCourse[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_eq]=${schoolId}&sort[]=-created_at`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch school courses.");
  const json = await res.json();
  return json.data || [];
}

export async function createSchoolRepo(payload: Partial<VsSchool>): Promise<VsSchool> {
  const url = `${DIRECTUS_BASE}/items/vs_school`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to create school.");
  return json.data;
}

export async function updateSchoolRepo(id: number, payload: Partial<VsSchool>): Promise<VsSchool> {
  const url = `${DIRECTUS_BASE}/items/vs_school/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to update school.");
  return json.data;
}

export async function createSchoolCourseRepo(payload: Partial<VsSchoolCourse>): Promise<VsSchoolCourse> {
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

export async function updateSchoolCourseRepo(id: number, payload: Partial<VsSchoolCourse>): Promise<VsSchoolCourse> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to update course.");
  return json.data;
}

export async function deleteSchoolCourseRepo(courseId: number): Promise<unknown> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course/${courseId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete course.");
  return null;
}

export async function fetchSchoolAdminsRepo(schoolId: number): Promise<VsSchoolAdminRecord[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_admin?filter[school_id][_eq]=${schoolId}&filter[is_active][_eq]=true&fields=*,user_id.user_fname,user_id.user_lname,user_id.user_email`;
  const res = await fetch(url, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to fetch school admins.");
  
  // Flatten the user_id relation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json.data.map((item: any) => ({
    ...item,
    user_fname: item.user_id?.user_fname,
    user_lname: item.user_id?.user_lname,
    user_email: item.user_id?.user_email,
    user_id: item.user_id?.user_id || item.user_id, // directus might expand it
  }));
}

export async function fetchAllSchoolsForDropdownRepo(): Promise<Partial<VsSchool>[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school?fields=school_id,school_name&limit=-1`;
  const res = await fetch(url, { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to fetch schools.");
  return json.data;
}

export async function removeSchoolAdminRepo(schoolAdminId: number): Promise<void> {
  const url = `${DIRECTUS_BASE}/items/vs_school_admin/${schoolAdminId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ is_active: false })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to remove school admin.");
}

export async function createSchoolAdminJunction(payload: { school_id: number; user_id: number; assigned_by: number; is_active?: boolean }): Promise<VsSchoolAdminRecord> {
  const url = `${DIRECTUS_BASE}/items/vs_school_admin`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to assign school admin.");
  return json.data;
}
