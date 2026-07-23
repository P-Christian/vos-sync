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
  user_id: number;

  applicant_name: string;
  applicant_email: string;

  job_title: string;

  application_status: ApplicationStatus;

  client_notes?: string | null;

  skills: string[];

  experience_years: number;

  work_experience_count: number;

  resume_count: number;

  profile_completion: number;

  applied_at?: string;
  status_updated_at?: string;
  profile_image_url?: string | null;
  active_interview_id?: number | null;
}

export interface WorkExperienceItem {
  id: number;

  company_name: string;
  job_title: string;

  location?: string | null;

  location_type?: string | null;

  employment_type?: string | null;

  start_date?: string | null;

  end_date?: string | null;

  is_current_role?: boolean;

  job_description?: string | null;
}

export interface EducationItem {
  school_name: string;

  course_name?: string | null;

  start_date?: string | null;

  end_date?: string | null;
}

export interface CertificationItem {
  id: number;

  certificate_name: string;

  issuing_organization: string;

  issue_date?: string | null;

  credential_url?: string | null;
}

export interface ResumeFile {
  file_url: string;

  file_name?: string | null;
}

export interface SocialLink {
  id?: number;
  platform?: string;
  platform_name?: string;
  profile_url?: string;
  url?: string;
}

export interface ScreeningAnswer {
  question_id: number;
  question_text: string;
  answer_text: string;
}

export interface CandidateDetail {
  application_id: number;

  job_id: number;

  user_id: number;

  application_status: ApplicationStatus;

  applicant_name: string;

  applicant_email: string;

  applicant_phone?: string | null;

  profile_image?: string | null;

  job_title: string;

  profile_headline?: string | null;

  professional_summary?: string | null;

  location?: string | null;

  cover_letter?: string | null;

  portfolio_url?: string | null;

  expected_salary?: number | null;

  screening_answers?: ScreeningAnswer[] | null;

  client_notes?: string | null;

  applied_at?: string;

  status_updated_at?: string | null;

  skills: string[];

  experience_years: number;

  work_experience_count: number;

  resume_count: number;

  profile_completion: number;

  resumes: ResumeFile[];

  work_experience: WorkExperienceItem[];

  education: EducationItem[];

  certifications: CertificationItem[];

  social_links: SocialLink[];
}

export const STATUS_LABELS: Record<
  ApplicationStatus,
  string
> = {
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