// src/modules/vos-admin/request-management/types/request.types.ts

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface VsSchoolRequest {
  school_request_id: number;
  requested_by: number | { user_id: number; user_fname: string; user_lname: string };
  requested_school_name: string;
  city_municipality?: string | null;
  province?: string | null;
  request_status: RequestStatus;
  matched_school_id?: number | null;
  admin_remarks?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface VsCourseRequest {
  course_request_id: number;
  school_id: number;
  requested_by: number | { user_id: number; user_fname: string; user_lname: string };
  requested_course_name: string;
  requested_course_code?: string | null;
  request_status: RequestStatus;
  matched_school_course_id?: number | null;
  admin_remarks?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ReviewAction {
  action: 'Approved' | 'Rejected';
  admin_remarks?: string;
  matched_school_id?: number;
  matched_school_course_id?: number;
}
