import { 
  fetchSchoolByUserIdRepo,
  fetchCoursesBySchoolIdRepo,
  updateSchoolRepo,
  createCourseRepo,
  updateCourseRepo
} from './school-admin.repo';
import { VsSchool, VsSchoolCourse, SchoolWithStats } from '../types/school-admin.types';

export async function getMySchool(userId: number): Promise<SchoolWithStats | null> {
  return fetchSchoolByUserIdRepo(userId);
}

export async function getMyCourses(schoolId: number): Promise<VsSchoolCourse[]> {
  return fetchCoursesBySchoolIdRepo(schoolId);
}

export async function updateMySchool(schoolId: number, data: Partial<VsSchool>, adminId: number): Promise<VsSchool> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
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
  
  return createCourseRepo(payload);
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
