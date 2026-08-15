// src/modules/client/dashboard/types.ts

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED" | "DRAFT";

export interface CompanyInfo {
  id: number;
  company_name: string;
  company_email: string;
  company_contact: string;
  industry?: string;
  business_type?: string;
  company_size?: string;
  company_website?: string;
  company_province?: string;
  company_city?: string;
  verification_status: VerificationStatus;
  profile_completion_percent?: number;
  verification_remarks?: string;
  company_logo?: string | null;
}

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  activeJobsDelta?: string;
  totalApplicants: number;
  applicantsGrowthPercent?: number;
  shortlistedCount: number;
  shortlistedWeeklyGrowth?: string;
  upcomingInterviewsCount: number;
  pendingInterviews?: number;
  nextInterviewSummary?: string;
  hiredCount: number;
}

export interface ChartDataPoint {
  label: string;
  applications: number;
  shortlisted?: number;
  interviews?: number;
}

export type TimeRangeKey = "7d" | "30d" | "3m" | "6m";

export type HiringOverviewChartData = Record<TimeRangeKey, ChartDataPoint[]>;

export interface JobPerformanceItem {
  id: number;
  job_id?: number;
  title: string;
  job_title?: string;
  department: string;
  job_department?: string | null;
  location?: string;
  job_location?: string;
  applicantsCount: number;
  applicants_count?: number;
  shortlistedCount: number;
  status: "ACTIVE" | "DRAFT" | "CLOSED" | "PAUSED" | string;
  postedAt: string;
  created_at?: string;
}

export type JobPosting = JobPerformanceItem;

export interface RecentApplicantItem {
  id: number;
  name: string;
  jobTitle: string;
  email: string;
  experience?: string;
  status: "APPLIED" | "SHORTLISTED" | "INTERVIEWING" | "HIRED" | "REJECTED";
  appliedDate: string;
  avatarUrl?: string | null;
  matchScore?: number;
}

export type Applicant = RecentApplicantItem;

export interface UpcomingInterviewItem {
  id: number;
  candidateName: string;
  candidateAvatar?: string | null;
  jobTitle: string;
  scheduledAt: string;
  displayDateGroup: "Today" | "Tomorrow" | "Upcoming" | string;
  dateLabel?: string;
  dateKey?: string;
  displayTime: string;
  format: "ONLINE" | "IN_PERSON" | "PHONE" | string;
  meetingLink?: string | null;
  status: string;
}

export interface ActionRequiredItem {
  id: string;
  type: "unreviewed_applicants" | "interview_pending" | "interview_outcome_pending" | "job_expiring" | "profile_verification" | "custom";
  title: string;
  description?: string;
  count?: number;
  severity: "urgent" | "warning" | "info" | "success";
  actionLabel: string;
  actionUrl: string;
  dismissible?: boolean;
}

export interface FilterState {
  search: string;
  department: string;
  status: string;
}

export interface DashboardData {
  onboardingRequired?: boolean;
  message?: string;
  company?: CompanyInfo;
  stats?: DashboardStats;
  chartData?: HiringOverviewChartData;
  jobPerformance?: JobPerformanceItem[];
  recentApplicants?: RecentApplicantItem[];
  upcomingInterviews?: UpcomingInterviewItem[];
  actionsRequired?: ActionRequiredItem[];
  recentJobs?: JobPosting[];
}
