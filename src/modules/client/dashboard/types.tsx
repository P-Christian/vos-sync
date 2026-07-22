// src/modules/client/dashboard/types.tsx

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export interface CompanyInfo {
  id: number;
  company_name: string;
  company_email: string;
  company_contact: string;
  industry: string;
  business_type?: string;
  company_size?: string;
  company_website?: string;
  company_province: string;
  company_city: string;
  verification_status: VerificationStatus;
  profile_completion_percent: number;
  verification_remarks?: string;
}

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  pendingInterviews: number;
  hiredCount: number;
}

export interface JobPosting {
  id: number;
  title: string;
  department: string;
  location: string;
  applicantsCount: number;
  status: "ACTIVE" | "DRAFT" | "CLOSED";
  postedAt: string;
}

export interface Applicant {
  id: number;
  name: string;
  jobTitle: string;
  email: string;
  experience: string;
  status: "APPLIED" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "HIRED" | "REJECTED";
  appliedDate: string;
}

export interface DashboardData {
  onboardingRequired?: boolean;
  message?: string;
  company?: CompanyInfo;
  stats?: DashboardStats;
  recentJobs?: JobPosting[];
  recentApplicants?: Applicant[];
}

export interface FilterState {
  search: string;
  department: string;
  status: string;
}

