// src/modules/client/jobs/types.tsx

export type JobStatus = "ACTIVE" | "DRAFT" | "CLOSED";
export type ExperienceLevel = "ENTRY" | "MID" | "SENIOR" | "MANAGER" | "EXECUTIVE";
export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";

export interface JobPosting {
  job_id: number;
  company_id: number;
  job_title: string;
  job_description?: string | null;
  job_requirements?: string | null;
  job_type: JobType;
  job_location: string;
  job_department?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_negotiable?: boolean;
  experience_level?: ExperienceLevel | null;
  status: JobStatus;
  applicants_count?: number;
  created_at?: string;
  updated_at?: string;
  job_category?: string;
  work_arrangement?: string;
  number_of_openings?: string;
  job_responsibilities?: string;
  job_qualifications?: string;
  skills?: { id: number; skill_name: string; source?: string; confidence_score?: number | null }[];
  salary_type?: string;
  currency?: string;
  benefits?: string[];
  education?: string;
  screening_questions?: string[];
}

export interface JobFormData {
  job_title: string;
  job_description: string;
  job_requirements: string;
  job_type: JobType | "";
  job_location: string;
  job_department: string;
  salary_min: string;
  salary_max: string;
  salary_negotiable: boolean;
  experience_level: ExperienceLevel | "";
  status: JobStatus;
  job_category?: string;
  work_arrangement?: string;
  number_of_openings?: string;
  job_responsibilities?: string;
  job_qualifications?: string;
  skills?: { id: number; skill_name: string; source?: string; confidence_score?: number | null }[];
  salary_type?: string;
  currency?: string;
  benefits?: string[];
  education?: string;
  screening_questions?: string[];
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: "Entry Level",
  MID: "Mid Level",
  SENIOR: "Senior Level",
  MANAGER: "Manager / Lead",
  EXECUTIVE: "Executive / Director",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  CLOSED: "Closed",
};

