// src/modules/freelancer/freelancer-applications/types/index.ts

export type ApplicationStatus =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'HIRED'
  | 'REJECTED';

export interface CompanyProfile {
  company_id: number;
  company_code: string;
  company_name: string;
  company_legal_name: string;
  company_email?: string | null;
  company_contact?: string | null;
  company_website?: string | null;
  company_description?: string | null;
  company_mission?: string | null;
  company_vision?: string | null;
  company_culture?: string | null;
  company_benefits?: string | null;
  industry_id?: number | null;
  organization_type_id?: number | null;
  company_size_id?: number | null;
  year_established?: number | null;
  company_province: string;
  company_city: string;
  company_brgy?: string | null;
  company_address?: string | null;
  company_zipCode?: string | null;
  registration_no?: string | null;
  company_tin?: string | null;
  company_logo?: string | null;
  company_cover?: string | null;
  company_facebook?: string | null;
  company_linkedin?: string | null;
  company_instagram?: string | null;
  company_x?: string | null;
  company_youtube?: string | null;
  company_tags?: string | null;
  is_public: boolean;
  is_active: boolean;
}

export interface ApplicationItem {
  application_id: number;
  job_id: number;
  user_id: number;
  job_title?: string;
  job_description?: string | null;
  company_id?: number | null;
  company_name?: string;
  company_details?: CompanyProfile | null;
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
  pendingApplications: number;
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

export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site';
export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR' | 'MANAGER' | 'EXECUTIVE';
export type SalaryType = 'Salary Range' | 'Fixed Salary' | 'Hourly Rate';

export interface JobScreeningQuestion {
  question_id: number;
  question_text: string;
}

export interface PublicJobPosting {
  job_id: number;
  company_id: number;
  company_name?: string | null;
  company_logo?: string | null;
  company_cover?: string | null;
  company_email?: string | null;
  company_contact?: string | null;
  company_address?: string | null;
  company_city?: string | null;
  company_province?: string | null;
  company_facebook?: string | null;
  company_linkedin?: string | null;
  company_instagram?: string | null;
  company_x?: string | null;
  company_youtube?: string | null;
  job_title: string;
  job_category: string;
  job_type: JobType;
  work_arrangement: WorkArrangement;
  job_location: string;
  job_department?: string | null;
  number_of_openings: number;
  job_description: string;
  job_responsibilities?: string | null;
  job_qualifications: string;
  salary_type: SalaryType;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_negotiable: boolean;
  currency: string;
  experience_level?: ExperienceLevel | null;
  education?: string | null;
  status: 'ACTIVE';
  created_at?: string;
  skills?: { id: number; skill_name: string }[];
  benefits?: string[];
  screening_questions?: (JobScreeningQuestion | string)[];
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  FREELANCE: 'Freelance',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: 'Entry Level',
  MID: 'Mid Level',
  SENIOR: 'Senior Level',
  MANAGER: 'Manager / Lead',
  EXECUTIVE: 'Executive / Director',
};
