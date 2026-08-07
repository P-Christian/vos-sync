// src/modules/matching-engine/engine/scorer.ts

import { EvaluatorResult } from "../types/evaluatorTypes";
import { BreakdownSection, MatchTraceItem, MatchContext } from "../types/matchTypes";

export interface ScoringOutput {
  compatibilityScore: number;
  sections: BreakdownSection[];
  trace: MatchTraceItem[];
}

export function calculateNormalizedScore(
  evaluatorResults: EvaluatorResult[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: MatchContext
): ScoringOutput {
  let weightedSum = 0;
  let totalWeights = 0;
  const sections: BreakdownSection[] = [];
  const trace: MatchTraceItem[] = [];

  for (const res of evaluatorResults) {
    if (res.weight <= 0) continue;

    // evaluator score contribution normalized to weight
    const scoreFraction = res.maxScore > 0 ? Math.min(res.score / res.maxScore, 1.0) : 0;
    const pointsContribution = Number((scoreFraction * res.weight).toFixed(1));

    weightedSum += pointsContribution;
    totalWeights += res.weight;

    sections.push({
      label: res.label,
      score: pointsContribution,
      max: res.weight,
      type: res.label.toLowerCase().includes("bonus") ? "bonus" : "score",
    });

    trace.push({
      factor: res.factor,
      result: res.explanationMessage,
      points: pointsContribution,
    });
  }

  // Calculate raw normalized score (sum of evaluator point contributions)
  const rawNormalized = totalWeights > 0 ? (weightedSum / totalWeights) * 100 : 0;
  const compatibilityScore = Math.min(100, Math.round(rawNormalized));

  return {
    compatibilityScore,
    sections,
    trace,
  };
}

