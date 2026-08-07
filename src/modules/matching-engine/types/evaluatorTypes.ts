// src/modules/matching-engine/types/evaluatorTypes.ts

export type EvidenceType =
  | "ROLE"
  | "SKILL"
  | "EXPERIENCE"
  | "EDUCATION"
  | "CERTIFICATION"
  | "PORTFOLIO";

export interface EvidenceItem {
  type: EvidenceType;
  label: string;
  value: string;
  scoreContribution: number;
}

export interface EvaluatorResult {
  factor: string;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  evidence: EvidenceItem[];
  strengths: string[];
  weaknesses: string[];
  explanationCode: string;
  explanationMessage: string;
}
