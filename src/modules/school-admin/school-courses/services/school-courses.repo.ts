import { VsSchoolCourse } from '@/modules/school-admin/types/school-admin.types';

export async function fetchSchoolCoursesRepo(): Promise<VsSchoolCourse[]> {
  const res = await fetch('/api/school-admin/school/courses', { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to fetch courses');
  }
  return json.courses || json.data || [];
}

export async function createSchoolCourseRepo(payload: Partial<VsSchoolCourse>): Promise<VsSchoolCourse> {
  const res = await fetch('/api/school-admin/school/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to add course');
  }
  return json.course || json.data;
}

export async function updateSchoolCourseRepo(courseId: number, payload: Partial<VsSchoolCourse>): Promise<VsSchoolCourse> {
  const res = await fetch(`/api/school-admin/school/courses/${courseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to update course');
  }
  return json.course || json.data;
}

export async function deleteSchoolCourseRepo(courseId: number): Promise<boolean> {
  const res = await fetch(`/api/school-admin/school/courses/${courseId}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to delete course');
  }
  return true;
}
