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

type EmployeeEducationRow = {
  readonly employee_education_id?: number;
  readonly id?: number;
  readonly school_id: number;
  readonly school_course_id: number | null;
  readonly course_name_raw?: string | null;
};

export async function upsertEmployeeEducation(userId: number, schoolId: number, courseId: number | null): Promise<void> {
  // Check if education record exists for this user
  const checkUrl = `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_eq]=${userId}&fields=*`;
  const checkRes = await fetch(checkUrl, { headers: getHeaders(), cache: "no-store" });
  if (!checkRes.ok) throw new Error("Failed to check existing employee education.");
  const checkJson: { readonly data?: readonly EmployeeEducationRow[] } = await checkRes.json();

  const payload = courseId === null
    ? {
        user_id: userId,
        school_id: schoolId,
        education_status: 'Verified'
      }
    : {
        user_id: userId,
        school_id: schoolId,
        school_course_id: courseId,
        education_status: 'Verified'
      };

  const matchedRecord = courseId === null
    ? checkJson.data?.find((row) => row.school_id === schoolId) ?? null
    : checkJson.data?.find(
        (row) => row.school_id === schoolId && row.school_course_id === courseId
      ) ?? checkJson.data?.find(
        (row) => row.school_id === schoolId && row.school_course_id === null
      ) ?? null;

  if (matchedRecord !== null) {
    // Auto-create course request if needed
    const requestedCourseName = matchedRecord.course_name_raw?.trim();
    if (courseId === null && requestedCourseName) {
      try {
        // Check if there's already a pending course request for this user and school to prevent duplicates
        const crCheckUrl = `${DIRECTUS_BASE}/items/vs_course_request?filter[requested_by][_eq]=${userId}&filter[school_id][_eq]=${schoolId}&filter[request_status][_eq]=Pending`;
        const crCheckRes = await fetch(crCheckUrl, { headers: getHeaders(), cache: "no-store" });
        const crCheckJson: { readonly data?: readonly unknown[] } = crCheckRes.ok
          ? await crCheckRes.json()
          : { data: [] };
        
        if (!crCheckJson.data || crCheckJson.data.length === 0) {
          await createCourseRequestRepo({
            school_id: schoolId,
            requested_by: userId,
            requested_course_name: requestedCourseName,
            request_status: 'Pending'
          });
        }
      } catch (err) {
        console.error("Failed to auto-create course request from upsert:", err);
      }
    }

    // Update existing
    const recordId = matchedRecord.employee_education_id || matchedRecord.id;
    const updateUrl = `${DIRECTUS_BASE}/items/vs_employee_education/${recordId}`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update employee education (status ${updateRes.status}).`);
    }
  } else {
    // Insert new
    const insertUrl = `${DIRECTUS_BASE}/items/vs_employee_education`;
    const insertRes = await fetch(insertUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!insertRes.ok) {
      throw new Error(`Failed to create employee education (status ${insertRes.status}).`);
    }
  }
}
