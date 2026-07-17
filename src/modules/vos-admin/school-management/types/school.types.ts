// src/modules/vos-admin/school-management/types/school.types.ts

export type SchoolStatus = 'Draft' | 'Pending' | 'Active' | 'Inactive';
export type SchoolType = 'University' | 'College' | 'Technical/Vocational' | 'Other';

export interface VsSchool {
  school_id: number;
  school_name: string;
  school_type: SchoolType;
  school_logo_url: string | null;
  school_description: string | null;
  school_email: string | null;
  school_contact_no: string | null;
  school_website: string | null;
  address_line: string | null;
  barangay: string | null;
  city_municipality: string;
  province: string;
  postal_code: string | null;
  country: string;
  school_status: SchoolStatus;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
}

export interface SchoolWithStats extends VsSchool {
  course_count: number;
  student_count: number;
}

export interface VsSchoolCourse {
  school_course_id: number;
  school_id: number;
  course_name: string;
  course_code: string | null;
  course_status: SchoolStatus;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
}

export interface VsSchoolAdminRecord {
  school_admin_id: number;
  school_id: number;
  user_id: number;
  is_active: boolean;
  assigned_by: number | null;
  created_at: string;
  // Joined from vs_user
  user_fname?: string;
  user_lname?: string;
  user_email?: string;
}

export interface CreateSchoolAdminPayload {
  school_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_contact: string;
  password?: string;
}
