// src/modules/matching-engine/config/scoringConfig.ts

import { MatchMode } from "../types/matchTypes";

export interface ModeWeights {
  role: number;
  experience: number;
  skills: number;
  education: number;
  certifications: number;
  availability: number;
  location: number;
  portfolio: number;
}

export const ENGINE_VERSION = "v1.0";

export const ROLE_SIMILARITY_SCORES = {
  exact_title: 45,
  canonical_alias: 42,
  same_role: 38,
  same_category: 32,
  keyword: 24,
  summary: 15,
};

export const SCORING_CONFIG: Record<MatchMode, ModeWeights> = {
  [MatchMode.ROLE_SIMILARITY]: {
    role: 45,
    experience: 30,
    skills: 15,
    education: 5,
    certifications: 5,
    availability: 0,
    location: 0,
    portfolio: 0,
  },
  [MatchMode.SKILL_MATCH]: {
    role: 15,
    experience: 20,
    skills: 45,
    education: 10,
    certifications: 10,
    availability: 0,
    location: 0,
    portfolio: 0,
  },
  [MatchMode.JOB_MATCH]: {
    role: 10,
    experience: 20,
    skills: 45,
    education: 10,
    certifications: 5,
    availability: 5,
    location: 5,
    portfolio: 0,
  },
  [MatchMode.HYBRID]: {
    role: 25,
    experience: 20,
    skills: 35,
    education: 10,
    certifications: 5,
    availability: 0,
    location: 0,
    portfolio: 5,
  },
  [MatchMode.BROWSE]: {
    role: 0,
    experience: 30,
    skills: 30,
    education: 20,
    certifications: 10,
    availability: 0,
    location: 0,
    portfolio: 10,
  },
  [MatchMode.AI_RERANK]: {
    role: 30,
    experience: 25,
    skills: 25,
    education: 10,
    certifications: 5,
    availability: 0,
    location: 0,
    portfolio: 5,
  },
};
