export type SchoolStatus = 'Active' | 'Inactive';
export type SchoolType = 'University' | 'College' | 'Technical/Vocational' | 'Other';

export interface VsSchoolAdmin {
  school_admin_id: number;
  school_id: number;
  user_id: number;
  is_active: boolean;
  assigned_by: number | null;
  created_at: string;
}

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
