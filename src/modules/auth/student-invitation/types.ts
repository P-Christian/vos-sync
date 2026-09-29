export interface StudentInvitationRecord {
  readonly invitation_id: number;
  readonly student_id: number;
  readonly school_id: number;
  readonly token: string;
  readonly expires_at: string;
  readonly is_used: boolean | number;
  readonly used_at: string | null;
  readonly created_at: string;
}

export interface SchoolStudentRecord {
  readonly student_id: number;
  readonly school_id: number;
  readonly first_name: string | null;
  readonly last_name: string | null;
  readonly email: string | null;
  readonly school_course_id: number | null;
  readonly school_year: string | null;
  readonly registered_user_id: number | null;
  readonly invitation_status: "Not Sent" | "Invited" | "Registered";
  /** Exact link to the verified education row; null while unlinked. */
  readonly employee_education_id: number | null;
}

export interface SchoolRecord {
  readonly school_id: number;
  readonly school_name: string;
}

export interface SchoolCourseRecord {
  readonly school_course_id: number;
  readonly course_name: string;
}

export type EducationStatus = "Verified" | "Pending" | "Unverified";

export interface EmployeeEducationRecord {
  readonly employee_education_id: number;
  readonly user_id: number;
  readonly school_id: number | null;
  readonly school_course_id: number | null;
  readonly school_name_raw: string | null;
  readonly course_name_raw: string | null;
  readonly education_status: EducationStatus | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
}

export type StudentInvitationPreviewState =
  | "valid"
  | "expired"
  | "used"
  | "registered"
  | "invalid";

export interface ValidStudentInvitationPreviewDto {
  readonly state: "valid";
  readonly schoolName: string;
  /** Course name; an empty string when the roster row has no course. */
  readonly courseName: string;
  readonly schoolYear: string;
  readonly studentFirstName: string;
  readonly studentLastName: string;
  readonly emailMasked: string;
  readonly expiresAt: string;
}

export interface ExpiredStudentInvitationPreviewDto {
  readonly state: "expired";
}

export interface UsedStudentInvitationPreviewDto {
  readonly state: "used";
}

export interface RegisteredStudentInvitationPreviewDto {
  readonly state: "registered";
}

export interface InvalidStudentInvitationPreviewDto {
  readonly state: "invalid";
}

export type StudentInvitationPreviewDto =
  | ValidStudentInvitationPreviewDto
  | ExpiredStudentInvitationPreviewDto
  | UsedStudentInvitationPreviewDto
  | RegisteredStudentInvitationPreviewDto
  | InvalidStudentInvitationPreviewDto;

export interface StudentInvitationClaimRequestDto {
  readonly token: string;
}

export interface StudentInvitationSameEmailClaimDto {
  readonly mode: "same_email";
  readonly notice: string;
}

export interface StudentInvitationOtpSentClaimDto {
  readonly mode: "otp_sent";
  readonly emailMasked: string;
  readonly otpExpiresAt: string;
  readonly resendAvailableAt: string;
  readonly attemptsRemaining: number;
}

/** Claim response when this account already owns the roster row. */
export interface StudentInvitationLinkedClaimDto {
  readonly state: "linked";
}

export type StudentInvitationClaimDto =
  | StudentInvitationSameEmailClaimDto
  | StudentInvitationOtpSentClaimDto
  | StudentInvitationLinkedClaimDto;

export interface StudentInvitationVerifyRequestDto {
  readonly token: string;
  readonly otp?: string;
}

export interface StudentInvitationVerifyDto {
  readonly state: "linked";
}
