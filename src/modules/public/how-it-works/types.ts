// src/modules/public/how-it-works/types.ts

export type RoleKey = "employee" | "employer" | "school";

export interface StepItem {
  stepNumber: number;
  title: string;
  statusChip: string;
  estimatedTime: string;
  description: string;
  outcome: string;
  requirements: string[];
  actionLabel?: string;
  actionRoute?: string;
  illustrationSrc: string;
  illustrationAlt: string;
}

export interface RoleGuide {
  roleKey: RoleKey;
  tabLabel: string;
  badgeText: string;
  heading: string;
  introduction: string;
  accentColor: string; // Tailwind color class or hex
  bgAccent: string;
  borderAccent: string;
  totalOnboardingTime: string;
  oneSentenceSummary: string;
  steps: StepItem[];
  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaLabel: string;
  finalCtaRoute: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: RoleKey | "general";
}
