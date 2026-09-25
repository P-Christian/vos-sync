export type StudentInvitationStatus = 'Not Sent' | 'Invited' | 'Registered';

export interface VsSchoolStudent {
  student_id: number;
  school_id: number;
  student_number: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  school_course_id: number | null;
  school_year: string | null;
  gpa: number | null;
  is_alumni: boolean;
  employee_education_id: number | null;
  invitation_status: StudentInvitationStatus;
  invited_at: string | null;
  registered_user_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  // Joined field helper
  course_name?: string;
  // Ranking fields
  rank?: number | null;
  cohort_total?: number;
}

export interface StudentRosterFilter {
  school_id: number;
  school_year?: string;
  school_course_id?: number | string;
  invitation_status?: StudentInvitationStatus | string;
  search_query?: string;
  // Server-side Current/Alumni separation. `false` =
  // Current Students view, `true` = Alumni view. Callers that omit it get
  // the Current default from the service layer — never an unfiltered mix.
  is_alumni?: boolean;
  page?: number;
  limit?: number;
}

export interface StudentRosterResponse {
  data: VsSchoolStudent[];
  total: number;
}
