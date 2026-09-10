import { StudentRosterFilter, VsSchoolStudent } from '../types/student-roster.types';

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

export async function fetchStudentsRepo(filter: StudentRosterFilter): Promise<{ data: VsSchoolStudent[]; total: number }> {
  const queryParams: string[] = [`filter[school_id][_eq]=${filter.school_id}`];
  
  if (filter.school_year) {
    queryParams.push(`filter[school_year][_eq]=${encodeURIComponent(filter.school_year)}`);
  }
  
  if (filter.school_course_id && filter.school_course_id !== 'all') {
    queryParams.push(`filter[school_course_id][_eq]=${filter.school_course_id}`);
  }

  if (filter.invitation_status && filter.invitation_status !== 'all') {
    queryParams.push(`filter[invitation_status][_eq]=${encodeURIComponent(filter.invitation_status)}`);
  }

  if (filter.search_query) {
    const q = encodeURIComponent(filter.search_query);
    queryParams.push(`filter[_or][0][first_name][_contains]=${q}&filter[_or][1][last_name][_contains]=${q}&filter[_or][2][email][_contains]=${q}&filter[_or][3][student_number][_contains]=${q}`);
  }

  queryParams.push('sort[]=-created_at');
  queryParams.push('fields=*,school_course_id.school_course_id,school_course_id.course_name');

  const queryString = queryParams.join('&');
  const url = `${DIRECTUS_BASE}/items/vs_school_student?${queryString}`;

  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch student roster: ${res.statusText}`);
  }

  const json = await res.json();
  const rawData = json.data || [];
  
  const mappedData: VsSchoolStudent[] = rawData.map((item: any) => {
    let courseName: string | undefined = undefined;
    let courseId: number | null = null;

    if (item.school_course_id && typeof item.school_course_id === 'object') {
      courseName = item.school_course_id.course_name;
      courseId = item.school_course_id.school_course_id ? Number(item.school_course_id.school_course_id) : null;
    } else if (item.school_course_id) {
      courseId = Number(item.school_course_id);
    }

    return {
      ...item,
      gpa: item.gpa !== null && item.gpa !== undefined && item.gpa !== '' ? Number(item.gpa) : null,
      course_name: courseName,
      school_course_id: courseId,
    };
  });

  return {
    data: mappedData,
    total: mappedData.length,
  };
}

export async function createStudentRepo(student: Partial<VsSchoolStudent>): Promise<VsSchoolStudent> {
  const url = `${DIRECTUS_BASE}/items/vs_school_student`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(student),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create student: ${errText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function bulkCreateStudentsRepo(students: Partial<VsSchoolStudent>[]): Promise<VsSchoolStudent[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_student`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(students),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to bulk create students: ${errText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function updateStudentRepo(studentId: number, student: Partial<VsSchoolStudent>): Promise<VsSchoolStudent> {
  const url = `${DIRECTUS_BASE}/items/vs_school_student/${studentId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(student),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update student: ${errText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function deleteStudentRepo(studentId: number): Promise<boolean> {
  const url = `${DIRECTUS_BASE}/items/vs_school_student/${studentId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete student: ${res.statusText}`);
  }

  return true;
}
