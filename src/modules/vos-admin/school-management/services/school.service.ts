// src/modules/vos-admin/school-management/services/school.service.ts
import { 
  fetchSchoolsRepo, 
  fetchSchoolByIdRepo, 
  fetchCoursesBySchoolRepo,
  createSchoolRepo,
  updateSchoolRepo,
  createSchoolCourseRepo,
  updateSchoolCourseRepo
} from './school.repo';
import { VsSchool, VsSchoolCourse, SchoolWithStats } from '../types/school.types';

export async function getSchoolList(status?: string, search?: string): Promise<SchoolWithStats[]> {
  return fetchSchoolsRepo(status, search);
}

export async function getSchoolDetail(id: number): Promise<SchoolWithStats | null> {
  return fetchSchoolByIdRepo(id);
}

export async function getSchoolCourses(schoolId: number): Promise<VsSchoolCourse[]> {
  return fetchCoursesBySchoolRepo(schoolId);
}

export async function createSchool(data: Partial<VsSchool>, adminId: number): Promise<VsSchool> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
    created_by: adminId,
    created_at: nowPH,
    school_status: data.school_status || 'Active',
  };
  
  return createSchoolRepo(payload);
}

export async function updateSchool(id: number, data: Partial<VsSchool>, adminId: number): Promise<VsSchool> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
    updated_by: adminId,
    updated_at: nowPH,
  };
  
  return updateSchoolRepo(id, payload);
}

export async function toggleSchoolStatus(id: number, currentStatus: string, adminId: number): Promise<VsSchool> {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  return updateSchool(id, { school_status: newStatus }, adminId);
}

export async function createCourse(schoolId: number, data: Partial<VsSchoolCourse>, adminId: number): Promise<VsSchoolCourse> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
    school_id: schoolId,
    created_by: adminId,
    created_at: nowPH,
    course_status: data.course_status || 'Active'
  };
  
  return createSchoolCourseRepo(payload);
}

export async function updateCourse(id: number, data: Partial<VsSchoolCourse>, adminId: number): Promise<VsSchoolCourse> {
  const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  
  const payload = {
    ...data,
    updated_by: adminId,
    updated_at: nowPH,
  };
  
  return updateSchoolCourseRepo(id, payload);
}
