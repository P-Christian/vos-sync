import { 
  fetchSchoolCoursesRepo, 
  createSchoolCourseRepo, 
  updateSchoolCourseRepo, 
  deleteSchoolCourseRepo 
} from './school-courses.repo';
import { createCourseSchema, updateCourseSchema } from '../types/school-courses.schema';
import { VsSchoolCourse, SchoolStatus } from '@/modules/school-admin/types/school-admin.types';

export async function executeFetchSchoolCourses(): Promise<VsSchoolCourse[]> {
  return await fetchSchoolCoursesRepo();
}

export async function executeCreateSchoolCourse(data: { course_name: string; course_code?: string | null }): Promise<VsSchoolCourse> {
  const parsed = createCourseSchema.safeParse(data);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'Validation error';
    throw new Error(errorMsg);
  }

  return await createSchoolCourseRepo({
    course_name: data.course_name.trim(),
    course_code: data.course_code ? data.course_code.trim() : null,
    course_status: 'Active'
  });
}

export async function executeUpdateSchoolCourse(courseId: number, data: { course_name?: string; course_code?: string | null; course_status?: SchoolStatus }): Promise<VsSchoolCourse> {
  const parsed = updateCourseSchema.partial().safeParse(data);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'Validation error';
    throw new Error(errorMsg);
  }

  return await updateSchoolCourseRepo(courseId, data);
}

export async function executeToggleCourseStatus(courseId: number, currentStatus: SchoolStatus): Promise<VsSchoolCourse> {
  const newStatus: SchoolStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  return await updateSchoolCourseRepo(courseId, { course_status: newStatus });
}

export async function executeDeleteSchoolCourse(courseId: number): Promise<boolean> {
  return await deleteSchoolCourseRepo(courseId);
}
