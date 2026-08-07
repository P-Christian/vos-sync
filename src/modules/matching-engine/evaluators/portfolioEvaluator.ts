// src/modules/matching-engine/evaluators/portfolioEvaluator.ts

import { NormalizedProfile } from "../types/profileTypes";
import { MatchContext } from "../types/matchTypes";
import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";

export function evaluatePortfolio(profile: NormalizedProfile, context: MatchContext, weight: number): EvaluatorResult {
  const maxScore = 10;
  let rawScore = 0;
  const evidence: EvidenceItem[] = [];
  const strengths: string[] = [];

  const github = profile.portfolioLinks.some((l) => l.toLowerCase().includes("github"));
  const portfolio = profile.portfolioLinks.some((l) => l.toLowerCase().includes("portfolio") || l.startsWith("http"));

  if (github) {
    rawScore += 5;
    evidence.push({ type: "PORTFOLIO", label: "GitHub Profile", value: "Verified GitHub link", scoreContribution: 5 });
    strengths.push("GitHub code portfolio attached");
  }

  if (portfolio) {
    rawScore += 5;
    evidence.push({ type: "PORTFOLIO", label: "Portfolio Link", value: "Online portfolio / website", scoreContribution: 5 });
    strengths.push("Online portfolio / website attached");
  }

  return {
    factor: "PORTFOLIO",
    label: "Portfolio",
    score: Math.min(maxScore, rawScore),
    maxScore,
    weight,
    evidence,
    strengths,
    weaknesses: rawScore === 0 ? ["No GitHub or personal portfolio links listed"] : [],
    explanationCode: rawScore > 0 ? "PORTFOLIO_PRESENT" : "PORTFOLIO_NONE",
    explanationMessage: rawScore > 0 ? `Portfolio score ${rawScore}/10.` : "No external portfolio links provided.",
  };
}
