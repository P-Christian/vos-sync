// src/modules/client/pipeline/types.ts

export type CanonicalStageType =
  | "APPLIED"
  | "SCREENING"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export const CANONICAL_STAGE_TYPES: readonly CanonicalStageType[] = [
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export const TERMINAL_STAGE_TYPES: readonly CanonicalStageType[] = [
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export interface StageTypeMetadata {
  label: string;
  description: string;
  isTerminal: boolean;
  defaultColor: string;
}

export const STAGE_TYPE_DETAILS: Record<CanonicalStageType, StageTypeMetadata> = {
  APPLIED: {
    label: "Applied",
    description: "New candidate submission awaiting initial evaluation.",
    isTerminal: false,
    defaultColor: "sky",
  },
  SCREENING: {
    label: "Screening",
    description: "Resume evaluation, initial recruiter screen, or AI verification.",
    isTerminal: false,
    defaultColor: "blue",
  },
  ASSESSMENT: {
    label: "Assessment",
    description: "Technical assessment, practical test, or take-home assignment.",
    isTerminal: false,
    defaultColor: "indigo",
  },
  INTERVIEW: {
    label: "Interview",
    description: "Live video interviews, technical rounds, or manager discussions.",
    isTerminal: false,
    defaultColor: "purple",
  },
  OFFER: {
    label: "Offer",
    description: "Formal employment offer sent and pending acceptance.",
    isTerminal: false,
    defaultColor: "amber",
  },
  HIRED: {
    label: "Hired",
    description: "Candidate accepted the offer and is officially hired.",
    isTerminal: true,
    defaultColor: "emerald",
  },
  REJECTED: {
    label: "Rejected",
    description: "Candidate did not advance in the hiring process.",
    isTerminal: true,
    defaultColor: "rose",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    description: "Candidate voluntarily withdrew from consideration.",
    isTerminal: true,
    defaultColor: "zinc",
  },
};

export interface CompanyPipeline {
  id: number;
  company_id: number;
  name: string;
  is_default: boolean;
  version: number;
  status: "ACTIVE" | "ARCHIVED";
  created_at?: string;
  updated_at?: string;
  stages?: PipelineStage[];
  transitions?: PipelineTransition[];
}

export interface PipelineStage {
  id: number;
  pipeline_id: number;
  stage_name: string;
  stage_type: CanonicalStageType;
  stage_order: number;
  color: string;
  description?: string | null;
  is_terminal: boolean;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
  // Computed IDs of destination stages for easy UI lookup
  allowed_next_stage_ids?: number[];
}

export interface PipelineTransition {
  id: number;
  pipeline_id: number;
  from_stage_id: number;
  to_stage_id: number;
  created_at?: string;
}

export interface JobPipelineVersion {
  id: number;
  job_id: number;
  source_pipeline_id?: number | null;
  version: number;
  is_active: boolean;
  is_locked?: boolean;
  application_count?: number;
  created_at?: string;
  stages?: JobPipelineStage[];
  transitions?: JobPipelineTransition[];
}

export const LEGACY_STATUS_TO_CANONICAL_MAP: Record<string, CanonicalStageType> = {
  APPLIED: "APPLIED",
  UNDER_REVIEW: "SCREENING",
  SHORTLISTED: "SCREENING",
  INTERVIEWING: "INTERVIEW",
  INTERVIEW: "INTERVIEW",
  OFFER: "OFFER",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
};

export const CANONICAL_TO_LEGACY_STATUS_MAP: Record<CanonicalStageType, string> = {
  APPLIED: "APPLIED",
  SCREENING: "UNDER_REVIEW",
  ASSESSMENT: "UNDER_REVIEW",
  INTERVIEW: "INTERVIEWING",
  OFFER: "SHORTLISTED",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
};

export interface JobPipelineStage {
  id: number;
  job_pipeline_id: number;
  stage_name: string;
  stage_type: CanonicalStageType;
  stage_order: number;
  color: string;
  description?: string | null;
  is_terminal: boolean;
  is_system: boolean;
  created_at?: string;
  allowed_next_stage_ids?: number[];
}

export interface JobPipelineTransition {
  id: number;
  job_pipeline_id: number;
  from_stage_id: number;
  to_stage_id: number;
  created_at?: string;
}

export interface ApplicationStageHistory {
  id: number;
  application_id: number;
  from_stage_id?: number | null;
  to_stage_id: number;
  changed_by?: number | null;
  change_reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

// Stage Color Palettes (semantic theme mapping avoiding hardcoded hex colors)
export const STAGE_COLOR_CLASSES: Record<string, { badge: string; dot: string; border: string }> = {
  sky: {
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60",
    dot: "bg-sky-500",
    border: "border-sky-300 dark:border-sky-700",
  },
  blue: {
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60",
    dot: "bg-blue-500",
    border: "border-blue-300 dark:border-blue-700",
  },
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60",
    dot: "bg-indigo-500",
    border: "border-indigo-300 dark:border-indigo-700",
  },
  purple: {
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60",
    dot: "bg-purple-500",
    border: "border-purple-300 dark:border-purple-700",
  },
  violet: {
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60",
    dot: "bg-violet-500",
    border: "border-violet-300 dark:border-violet-700",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
    dot: "bg-amber-500",
    border: "border-amber-300 dark:border-amber-700",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
    dot: "bg-rose-500",
    border: "border-rose-300 dark:border-rose-700",
  },
  zinc: {
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    dot: "bg-zinc-500",
    border: "border-zinc-300 dark:border-zinc-600",
  },
};
