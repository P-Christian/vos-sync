export type ApplicationStatus = 'Offer' | 'Interviewing' | 'Under Review' | 'Applied';

export interface ApplicationItem {
  id: string;
  jobTitle: string;
  jobType: string;
  location: string;
  companyName: string;
  companyLogoInitial: string;
  dateApplied: string;
  status: ApplicationStatus;
}

export interface ApplicationSummary {
  totalApplied: number;
  interviewing: number;
  activeOffers: number;
  successRate: number;
}
