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
  experience_level?: string | null;
  application_status: ApplicationStatus;
  cover_letter?: string | null;
  expected_salary?: number | null;
  portfolio_url?: string | null;
  applied_at?: string;
  status_updated_at?: string;
  resume?: {
    file_name: string;
    file_url: string;
  };
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

export interface BookmarkedJob {
  bookmark_id: number;
  job_id: number;
  user_id: number;
  job_title?: string;
  company_name?: string;
  company_logo?: string | null;
  job_type?: string;
  job_location?: string;
  work_arrangement?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string;
  salary_negotiable?: boolean;
  bookmarked_at?: string;
}
