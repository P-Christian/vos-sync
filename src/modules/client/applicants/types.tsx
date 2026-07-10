// src/modules/client/applicants/types.tsx

export type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "HIRED"
  | "REJECTED";

export interface Applicant {
  application_id: number;
  job_id: number;
  user_id?: number;
  applicant_name?: string;
  applicant_email?: string;
  job_title?: string;
  experience?: string;
  application_status: ApplicationStatus;
  client_notes?: string | null;
  applied_at?: string;
  status_updated_at?: string;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export const STATUS_FLOW: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "HIRED",
  "REJECTED",
];

