// src/modules/school-admin/school-management/services/school.repo.ts
import { VsSchool, VsSchoolCourse, SchoolWithStats } from '../types/school.types';

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
  
  // NOTE: In a real implementation with Directus, you would query aggregates for courses and students.
  // We'll mock the counts for the list view to avoid N+1 queries if we don't have a direct GraphQL/Aggregate endpoint ready.
  return (json.data || []).map((school: VsSchool) => ({
    ...school,
    course_count: 0, 
    student_count: 0,
  }));
}

export async function fetchSchoolByIdRepo(id: number): Promise<SchoolWithStats | null> {
  const url = `${DIRECTUS_BASE}/items/vs_school/${id}?fields=*`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.data) return null;
  
  // Fetch actual counts if needed, but for MVP we return 0
  return {
    ...json.data,
    course_count: 0,
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
