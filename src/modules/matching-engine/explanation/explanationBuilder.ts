// src/modules/matching-engine/explanation/explanationBuilder.ts

import { EvaluatorResult } from "../types/evaluatorTypes";
import { MatchExplanation, MatchExplanationItem, MatchContext } from "../types/matchTypes";

export function buildExplanation(
  evaluatorResults: EvaluatorResult[],
  context: MatchContext,
  overallScore: number
): MatchExplanation {
  const items: MatchExplanationItem[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const res of evaluatorResults) {
    if (res.explanationCode && res.explanationCode !== "NO_KEYWORD" && res.explanationCode !== "CERTS_NONE") {
      items.push({
        code: res.explanationCode,
        message: res.explanationMessage,
      });
    }
    strengths.push(...res.strengths);
    weaknesses.push(...res.weaknesses);
  }

  let summary = `Candidate achieves ${overallScore}% compatibility for ${context.mode} mode.`;
  if (context.keyword) {
    summary = `Matched role '${context.taxonomyContext?.resolved_role ?? context.keyword}' with ${overallScore}% compatibility score.`;
  }

  return {
    summary,
    items,
    strengths: Array.from(new Set(strengths)),
    weaknesses: Array.from(new Set(weaknesses)),
  };
}
