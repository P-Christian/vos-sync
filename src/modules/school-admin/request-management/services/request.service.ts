// src/modules/school-admin/request-management/services/request.service.ts
import { 
  VsSchoolRequest, 
  VsCourseRequest, 
  ReviewAction 
} from '../types/request.types';
import { 
  fetchSchoolRequestsRepo, 
  fetchCourseRequestsRepo, 
  reviewSchoolRequestRepo, 
  reviewCourseRequestRepo,
  createSchoolRequestRepo,
  createCourseRequestRepo
} from './request.repo';

export async function getSchoolRequests(status?: string): Promise<VsSchoolRequest[]> {
  return fetchSchoolRequestsRepo(status);
}

export async function getCourseRequests(status?: string): Promise<VsCourseRequest[]> {
  return fetchCourseRequestsRepo(status);
}

export async function reviewSchoolRequest(id: number, data: ReviewAction, adminId: number): Promise<VsSchoolRequest> {
  const payload: Partial<VsSchoolRequest> = {
    request_status: data.action,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  };

  if (data.action === 'Approved') {
    if (!data.matched_school_id) {
      throw new Error("A matched school ID is required when approving a school request.");
    }
    payload.matched_school_id = data.matched_school_id;
  } else if (data.action === 'Rejected') {
    if (!data.admin_remarks || data.admin_remarks.trim() === '') {
      throw new Error("Admin remarks are required when rejecting a school request.");
    }
    payload.admin_remarks = data.admin_remarks;
  }

  return reviewSchoolRequestRepo(id, payload);
}

export async function reviewCourseRequest(id: number, data: ReviewAction, adminId: number): Promise<VsCourseRequest> {
  const payload: Partial<VsCourseRequest> = {
    request_status: data.action,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  };

  if (data.action === 'Approved') {
    if (!data.matched_school_course_id) {
      throw new Error("A matched course ID is required when approving a course request.");
    }
    payload.matched_school_course_id = data.matched_school_course_id;
  } else if (data.action === 'Rejected') {
    if (!data.admin_remarks || data.admin_remarks.trim() === '') {
      throw new Error("Admin remarks are required when rejecting a course request.");
    }
    payload.admin_remarks = data.admin_remarks;
  }

  return reviewCourseRequestRepo(id, payload);
}

export async function createSchoolRequest(data: any, adminId: number): Promise<VsSchoolRequest> {
  const payload: Partial<VsSchoolRequest> = {
    requested_by: adminId,
    requested_school_name: data.requested_school_name,
    city_municipality: data.city_municipality || null,
    province: data.province || null,
    request_status: 'Pending',
  };
  return createSchoolRequestRepo(payload);
}

export async function createCourseRequest(data: any, adminId: number): Promise<VsCourseRequest> {
  const payload: Partial<VsCourseRequest> = {
    requested_by: adminId,
    school_id: data.school_id,
    requested_course_name: data.requested_course_name,
    requested_course_code: data.requested_course_code || null,
    request_status: 'Pending',
  };
  return createCourseRequestRepo(payload);
}
