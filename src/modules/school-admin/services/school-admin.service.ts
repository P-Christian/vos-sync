import { 
  fetchSchoolByUserIdRepo,
  fetchCoursesBySchoolIdRepo,
  updateSchoolRepo,
  createCourseRepo,
  updateCourseRepo,
  fetchSchoolByIdRepo
} from './school-admin.repo';
import { VsSchool, VsSchoolCourse, SchoolWithStats } from '../types/school-admin.types';

export function calculateSchoolCompletion(school: Partial<VsSchool>, courseCount: number): number {
  let percent = 0;
  if (school.school_name?.trim()) percent += 10;
  if (school.school_type) percent += 10;
  if (school.school_email?.trim()) percent += 10;
  if (school.school_contact_no?.trim()) percent += 10;
  if (school.school_description?.trim()) percent += 10;
  if (school.school_logo_url?.trim()) percent += 10;
  if (school.school_website?.trim()) percent += 5;
  if (school.address_line?.trim()) percent += 5;
  if (school.barangay?.trim()) percent += 5;
  if (school.city_municipality?.trim()) percent += 5;
  if (school.province?.trim()) percent += 5;
  if (school.postal_code?.trim()) percent += 5;
  if (courseCount > 0) percent += 10;
  return percent;
}

export async function getMySchool(userId: number): Promise<SchoolWithStats | null> {
  return fetchSchoolByUserIdRepo(userId);
}

export async function getMyCourses(schoolId: number): Promise<VsSchoolCourse[]> {
  return fetchCoursesBySchoolIdRepo(schoolId);
}

export async function updateMySchool(schoolId: number, data: Partial<VsSchool>, adminId: number): Promise<VsSchool> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  // Fetch active courses to calculate completion correctly
  let courseCount = 0;
  try {
    const courses = await fetchCoursesBySchoolIdRepo(schoolId);
    courseCount = courses.length;
  } catch (err) {
    console.error("Failed to fetch course count for completion calculation", err);
  }

  // Fetch current school to merge existing fields
  let currentSchool: Partial<VsSchool> = {};
  try {
    const fetched = await fetchSchoolByIdRepo(schoolId);
    if (fetched) currentSchool = fetched;
  } catch (err) {
    console.error("Failed to fetch school details for completion calculation", err);
  }

  const mergedSchool = { ...currentSchool, ...data };

  // Calculate new completion percent based on merged profile fields
  const completionPercent = calculateSchoolCompletion(mergedSchool, courseCount);

  const payload = {
    ...data,
    profile_completion_percent: completionPercent,
    updated_by: adminId,
    updated_at: nowPH,
  };
  
  return updateSchoolRepo(schoolId, payload);
}

export async function createMyCourse(schoolId: number, data: Partial<VsSchoolCourse>, adminId: number): Promise<VsSchoolCourse> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
    school_id: schoolId,
    created_by: adminId,
    created_at: nowPH,
    course_status: data.course_status || 'Active'
  };
  
  const newCourse = await createCourseRepo(payload);

  // Recalculate school completion since courses count changed
  try {
    const courses = await fetchCoursesBySchoolIdRepo(schoolId);
    // Fetch current school to update with new percent
    const adminUrl = `${(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")}/items/vs_school/${schoolId}`;
    const res = await fetch(adminUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(process.env.DIRECTUS_STATIC_TOKEN ? { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` } : {})
      },
      cache: "no-store"
    });
    if (res.ok) {
      const currentSchoolJson = await res.json();
      const currentSchool = currentSchoolJson.data;
      if (currentSchool) {
        const newPercent = calculateSchoolCompletion(currentSchool, courses.length);
        await updateSchoolRepo(schoolId, { profile_completion_percent: newPercent });
      }
    }
  } catch (err) {
    console.error("Failed to update school completion on course creation", err);
  }

  return newCourse;
}

export async function updateMyCourse(courseId: number, data: Partial<VsSchoolCourse>, adminId: number): Promise<VsSchoolCourse> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
    updated_by: adminId,
    updated_at: nowPH,
  };
  
  return updateCourseRepo(courseId, payload);
}

export async function toggleMyCourseStatus(courseId: number, currentStatus: string, adminId: number): Promise<VsSchoolCourse> {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  return updateMyCourse(courseId, { course_status: newStatus as "Active" | "Inactive" }, adminId);
}

