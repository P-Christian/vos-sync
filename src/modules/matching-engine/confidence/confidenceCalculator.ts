// src/modules/matching-engine/confidence/confidenceCalculator.ts

import { NormalizedProfile } from "../types/profileTypes";
import { MatchConfidenceLevel } from "../types/matchTypes";

export interface ConfidenceResult {
  score: number;
  level: MatchConfidenceLevel;
}

export function calculateConfidence(profile: NormalizedProfile): ConfidenceResult {
  const score = profile.profileCompletenessScore;
  let level: MatchConfidenceLevel = "LOW";

  if (score >= 71) {
    level = "HIGH";
  } else if (score >= 41) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  return { score, level };
}
