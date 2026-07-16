// src/modules/vos-admin/request-management/services/request.repo.ts
import { VsSchoolRequest, VsCourseRequest } from '../types/request.types';

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

export async function fetchSchoolRequestsRepo(status?: string): Promise<VsSchoolRequest[]> {
  let filterQuery = '';
  if (status && status !== 'ALL') {
    filterQuery = `&filter[request_status][_eq]=${status}`;
  }
  const url = `${DIRECTUS_BASE}/items/vs_school_request?fields=*,requested_by.user_id,requested_by.user_fname,requested_by.user_lname&sort=-created_at${filterQuery}`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch school requests from database.");
  const json = await res.json();
  return json.data || [];
}

export async function fetchCourseRequestsRepo(status?: string): Promise<VsCourseRequest[]> {
  let filterQuery = '';
  if (status && status !== 'ALL') {
    filterQuery = `&filter[request_status][_eq]=${status}`;
  }
  // Expand school_id to get school_name for the UI
  const url = `${DIRECTUS_BASE}/items/vs_course_request?fields=*,requested_by.user_id,requested_by.user_fname,requested_by.user_lname,school_id.*&sort=-created_at${filterQuery}`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch course requests from database.");
  const json = await res.json();
  return json.data || [];
}

export async function reviewSchoolRequestRepo(id: number, payload: Partial<VsSchoolRequest>): Promise<VsSchoolRequest> {
  const url = `${DIRECTUS_BASE}/items/vs_school_request/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to update school request.");
  return json.data;
}

export async function reviewCourseRequestRepo(id: number, payload: Partial<VsCourseRequest>): Promise<VsCourseRequest> {
  const url = `${DIRECTUS_BASE}/items/vs_course_request/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to update course request.");
  return json.data;
}

export async function createSchoolRequestRepo(payload: Partial<VsSchoolRequest>): Promise<VsSchoolRequest> {
  const url = `${DIRECTUS_BASE}/items/vs_school_request`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to create school request.");
  return json.data;
}

export async function createCourseRequestRepo(payload: Partial<VsCourseRequest>): Promise<VsCourseRequest> {
  const url = `${DIRECTUS_BASE}/items/vs_course_request`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message || "Failed to create course request.");
  return json.data;
}

export async function fetchSchoolRequestById(id: number): Promise<VsSchoolRequest> {
  const url = `${DIRECTUS_BASE}/items/vs_school_request/${id}?fields=*,requested_by.user_id,requested_by.user_fname,requested_by.user_lname`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch school request details.");
  const json = await res.json();
  return json.data;
}

export async function fetchCourseRequestById(id: number): Promise<VsCourseRequest> {
  const url = `${DIRECTUS_BASE}/items/vs_course_request/${id}?fields=*,requested_by.user_id,requested_by.user_fname,requested_by.user_lname,school_id.*`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch course request details.");
  const json = await res.json();
  return json.data;
}

export async function upsertEmployeeEducation(userId: number, schoolId: number, courseId: number | null): Promise<void> {
  // Check if education record exists for this user
  const checkUrl = `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_eq]=${userId}`;
  const checkRes = await fetch(checkUrl, { headers: getHeaders(), cache: "no-store" });
  if (!checkRes.ok) throw new Error("Failed to check existing employee education.");
  const checkJson = await checkRes.json();
  
  const payload = {
    user_id: userId,
    school_id: schoolId,
    school_course_id: courseId
  };

  if (checkJson.data && checkJson.data.length > 0) {
    // Update existing
    const recordId = checkJson.data[0].employee_education_id || checkJson.data[0].id;
    const updateUrl = `${DIRECTUS_BASE}/items/vs_employee_education/${recordId}`;
    await fetch(updateUrl, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
  } else {
    // Insert new
    const insertUrl = `${DIRECTUS_BASE}/items/vs_employee_education`;
    await fetch(insertUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
  }
}
