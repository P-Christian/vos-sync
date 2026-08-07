// src/modules/matching-engine/types/profileTypes.ts

export interface NormalizedWorkEntry {
  company: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  years: number;
}

export interface NormalizedEduEntry {
  school: string | null;
  course: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface NormalizedCertEntry {
  name: string;
  issuer: string | null;
}

export interface NormalizedProfile {
  id: number;
  name: string;
  email: string;
  headline: string | null;
  summary: string | null;
  location: string;
  availability: string;
  titles: string[];
  skills: string[];
  workHistory: NormalizedWorkEntry[];
  education: NormalizedEduEntry[];
  certifications: NormalizedCertEntry[];
  portfolioLinks: string[];
  profileCompletenessScore: number;
  activityScore: number;
}
