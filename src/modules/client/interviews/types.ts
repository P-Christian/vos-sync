// src/modules/client/interviews/types.ts

export type InterviewStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "NO_SHOW";

export type InterviewFormat = "ONLINE" | "ONSITE" | "PHONE";

export interface ScreeningAnswer {
  question_id?: number;
  question_text: string;
  answer_text: string;
}

export interface Interview {
  interview_id: number;
  company_id: number;
  application_id: number;
  interviewer_user_id: number;
  scheduled_at: string;
  duration_minutes?: number;
  timezone?: string;
  interview_format: InterviewFormat;
  meeting_link?: string | null;
  meeting_location?: string | null;
  interview_notes?: string | null;
  candidate_notes?: string | null;
  feedback?: string | null;
  evaluation_score?: number | null;
  interview_status: InterviewStatus;
  cancel_reason?: string | null;
  created_by_user_id?: number;
  updated_by_user_id?: number | null;

  // Joined applicant / job fields
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string | null;
  applicant_avatar?: string | null;
  job_title?: string;
  job_id?: number;
  application_status?: string;
  screening_answers?: ScreeningAnswer[] | null;
  created_at?: string;
}

export interface InterviewFormData {
  interview_id?: string;
  application_id: string;
  scheduled_at: string; // "YYYY-MM-DDTHH:mm" format for datetime-local
  duration_minutes: number;
  timezone: string;
  interview_format: InterviewFormat | "";
  meeting_link: string;
  meeting_location: string;
  interview_notes: string;
  candidate_notes: string;
}

export interface EvaluationFormData {
  interview_id: number;
  evaluation_score: number;
  feedback: string;
  decision?: "HIRED" | "REJECTED" | "NO_ACTION";
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  SCHEDULED: "Scheduled",
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
