// src/modules/matching-engine/engine/ranking.ts

import { NormalizedProfile } from "../types/profileTypes";

export function calculateRankingScore(
  compatibilityScore: number,
  profile: NormalizedProfile
): number {
  // ranking_score = (compatibility_score * 0.85) + (profileCompleteness * 0.10) + (activityScore * 0.05)
  const score =
    compatibilityScore * 0.85 +
    profile.profileCompletenessScore * 0.10 +
    profile.activityScore * 0.05;

  return Number(score.toFixed(1));
}
