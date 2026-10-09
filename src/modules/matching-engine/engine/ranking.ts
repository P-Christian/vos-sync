import { NormalizedProfile } from "../types/profileTypes";
import { matchCandidateName } from "../retrieval/nameMatcher";
import { matchSchool } from "../retrieval/schoolMatcher";

export function calculateRankingScore(
  compatibilityScore: number,
  profile: NormalizedProfile,
  searchKeyword?: string
): number {
  // ranking_score = (compatibility_score * 0.85) + (profileCompleteness * 0.10) + (activityScore * 0.05)
  let score =
    compatibilityScore * 0.85 +
    profile.profileCompletenessScore * 0.10 +
    profile.activityScore * 0.05;

  if (searchKeyword && searchKeyword.trim()) {
    const rawKeyword = searchKeyword.trim();
    const nameMatch = matchCandidateName(rawKeyword, profile.name);
    if (nameMatch.matched) {
      // Prioritize explicit name search results at the top
      score += nameMatch.score === 100 ? 35 : 25;
    } else {
      // Check if candidate attended the explicitly searched school
      for (const edu of profile.education) {
        if (edu.school && matchSchool(rawKeyword, edu.school).matched) {
          score += 15;
          break;
        }
      }
    }
  }

  return Number(score.toFixed(1));
}
