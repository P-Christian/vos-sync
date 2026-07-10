// src/modules/client/interviews/types.tsx

export type InterviewStatus =
  | "CONFIRMED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "NO_SHOW";

export type InterviewFormat = "ONLINE" | "ONSITE" | "PHONE";

export interface Interview {
  interview_id: number;
  company_id: number;
  application_id: number;
  interviewer_user_id?: number;
  applicant_name?: string;
  job_title?: string;
  interview_date: string;
  interview_time: string;
  interview_format: InterviewFormat;
  meeting_link?: string | null;
  meeting_location?: string | null;
  interview_notes?: string | null;
  interview_status: InterviewStatus;
  created_at?: string;
}

export interface InterviewFormData {
  application_id: string;
  interview_date: string;
  interview_time: string;
  interview_format: InterviewFormat | "";
  meeting_link: string;
  meeting_location: string;
  interview_notes: string;
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  ONLINE: "Online (Video Call)",
  ONSITE: "On-Site",
  PHONE: "Phone Call",
};

