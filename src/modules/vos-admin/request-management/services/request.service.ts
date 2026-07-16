// src/modules/vos-admin/request-management/services/request.service.ts
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
  createCourseRequestRepo,
  fetchSchoolRequestById,
  fetchCourseRequestById,
  upsertEmployeeEducation
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

  await reviewSchoolRequestRepo(id, payload);

  // If approved, upsert the employee education record with the matched school and a null course
  if (data.action === 'Approved' && data.matched_school_id) {
    const originalRequest = await fetchSchoolRequestById(id);
    if (originalRequest && originalRequest.requested_by) {
      // requested_by comes back populated or as ID depending on fields, handle both:
      const userId = typeof originalRequest.requested_by === 'object' 
        ? (originalRequest.requested_by as {user_id: number}).user_id 
        : originalRequest.requested_by;
      
      if (userId) {
        await upsertEmployeeEducation(Number(userId), data.matched_school_id, null);
      }
    }
  }

  // Re-fetch the updated request to ensure we have the populated `requested_by` fields for the UI
  return fetchSchoolRequestById(id);
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

  await reviewCourseRequestRepo(id, payload);

  // If approved, upsert the employee education record with the matched course
  if (data.action === 'Approved' && data.matched_school_course_id) {
    const originalRequest = await fetchCourseRequestById(id);
    if (originalRequest && originalRequest.requested_by) {
      const userId = typeof originalRequest.requested_by === 'object' 
        ? (originalRequest.requested_by as {user_id: number}).user_id 
        : originalRequest.requested_by;
      
      // We must pass the school_id too since vs_employee_education requires it.
      // We assume originalRequest.school_id is available.
      const schoolId = typeof originalRequest.school_id === 'object'
        ? (originalRequest.school_id as {school_id: number}).school_id
        : originalRequest.school_id;

      if (userId && schoolId) {
        await upsertEmployeeEducation(Number(userId), Number(schoolId), data.matched_school_course_id);
      }
    }
  }

  // Re-fetch the updated request to ensure we have the populated `requested_by` fields for the UI
  return fetchCourseRequestById(id);
}

export async function createSchoolRequest(data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, adminId: number): Promise<VsSchoolRequest> {
  const payload: Partial<VsSchoolRequest> = {
    requested_by: adminId,
    requested_school_name: data.requested_school_name,
    city_municipality: data.city_municipality || null,
    province: data.province || null,
    request_status: 'Pending' as const,
  };
  return createSchoolRequestRepo(payload);
}

export async function createCourseRequest(data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, adminId: number): Promise<VsCourseRequest> {
  const payload: Partial<VsCourseRequest> = {
    requested_by: adminId,
    school_id: data.school_id,
    requested_course_name: data.requested_course_name,
    requested_course_code: data.requested_course_code || null,
    request_status: 'Pending' as const,
  };
  return createCourseRequestRepo(payload);
}
