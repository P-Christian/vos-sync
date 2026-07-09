import { ApplicationItem, ApplicationSummary } from './types';

export const summaryData: ApplicationSummary = {
  totalApplied: 34,
  interviewing: 4,
  activeOffers: 1,
  successRate: 12,
};

export const applicationsData: ApplicationItem[] = [
  {
    id: '1',
    jobTitle: 'Senior Product Designer',
    jobType: 'Full-time',
    location: 'Remote',
    companyName: 'Velocity SaaS',
    companyLogoInitial: 'V',
    dateApplied: 'Oct 12, 2023',
    status: 'Offer',
  },
  {
    id: '2',
    jobTitle: 'UX Research Lead',
    jobType: 'Contract',
    location: 'New York',
    companyName: 'GreenPath Tech',
    companyLogoInitial: 'G',
    dateApplied: 'Oct 14, 2023',
    status: 'Interviewing',
  },
  {
    id: '3',
    jobTitle: 'Brand Identity Consultant',
    jobType: 'Project',
    location: 'Global',
    companyName: 'Nexus Studio',
    companyLogoInitial: 'N',
    dateApplied: 'Oct 15, 2023',
    status: 'Under Review',
  },
  {
    id: '4',
    jobTitle: 'Visual Designer (Fintech)',
    jobType: 'Full-time',
    location: 'London',
    companyName: 'Ledger Labs',
    companyLogoInitial: 'L',
    dateApplied: 'Oct 18, 2023',
    status: 'Applied',
  },
  {
    id: '5',
    jobTitle: 'Growth Marketing Designer',
    jobType: 'Contract',
    location: 'Remote',
    companyName: 'Ascend Agency',
    companyLogoInitial: 'A',
    dateApplied: 'Oct 20, 2023',
    status: 'Applied',
  },
];
