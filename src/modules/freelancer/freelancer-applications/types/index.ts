// src/modules/freelancer/freelancer-applications/types/index.ts

export type ApplicationStatus =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'HIRED'
  | 'REJECTED';

export interface ApplicationItem {
  application_id: number;
  job_id: number;
  user_id: number;
  job_title?: string;
  company_name?: string;
  job_type?: string;
  job_location?: string;
  work_arrangement?: string;
  application_status: ApplicationStatus;
  cover_letter?: string | null;
  expected_salary?: number | null;
  portfolio_url?: string | null;
  applied_at?: string;
  status_updated_at?: string;
}

export interface ApplicationSummary {
  totalApplied: number;
  interviewing: number;
  activeOffers: number;
  successRate: number;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};
