// src/modules/school-admin/success-metrics/services/success-metrics.repo.ts
import { SuccessMetricsFilter } from '../types/success-metrics.types';

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (DIRECTUS_TOKEN) h['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function fetchSchoolCoursesRepo(schoolId: number): Promise<Record<string, unknown>[]> {
  const url = `${DIRECTUS_BASE}/items/vs_school_course?filter[school_id][_eq]=${schoolId}&fields=school_course_id,school_id,course_name,course_code,degree,course_status&limit=500`;
  const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch school courses: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchSchoolStudentsRepo(filter: SuccessMetricsFilter): Promise<Record<string, unknown>[]> {
  let url = `${DIRECTUS_BASE}/items/vs_school_student?filter[school_id][_eq]=${filter.school_id}&fields=student_id,school_id,first_name,last_name,email,school_course_id,school_year,gpa,invitation_status,registered_user_id,is_alumni,created_at&limit=2000`;

  if (filter.school_year && filter.school_year !== 'ALL') {
    url += `&filter[school_year][_eq]=${encodeURIComponent(filter.school_year)}`;
  }
  if (filter.school_course_id && filter.school_course_id !== 'ALL') {
    url += `&filter[school_course_id][_eq]=${filter.school_course_id}`;
  }
  if (filter.is_alumni !== undefined) {
    const isAlumniVal = filter.is_alumni === true || filter.is_alumni === 'true' ? '1' : '0';
    url += `&filter[is_alumni][_eq]=${isAlumniVal}`;
  }

  const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch school students: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchJobApplicationsForUsersRepo(userIds: number[]): Promise<Record<string, unknown>[]> {
  if (!userIds.length) return [];

  // Chunk in batches of 100 to avoid URI length / Directus query timeouts
  const CHUNK_SIZE = 100;
  const chunks: number[][] = [];
  for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
    chunks.push(userIds.slice(i, i + CHUNK_SIZE));
  }

  // Join job posting and company fields directly in one trip
  const promises = chunks.map(async (chunk) => {
    const joinedIds = chunk.join(',');
    const url = `${DIRECTUS_BASE}/items/vs_job_application?filter[user_id][_in]=${joinedIds}&fields=application_id,job_id.job_id,job_id.job_title,job_id.salary_min,job_id.salary_max,job_id.company_id.company_id,job_id.company_id.company_name,job_id.company_id.company_logo,user_id,application_status,expected_salary,applied_at,status_updated_at&limit=2000`;
    const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  });

  const results = await Promise.all(promises);
  return results.flat();
}

