// src/modules/matching-engine/evaluators/educationEvaluator.ts

import { NormalizedProfile, NormalizedEduEntry } from "../types/profileTypes";
import { MatchContext } from "../types/matchTypes";
import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";

const TECH_COURSE_KEYWORDS = [
  "computer science",
  "information technology",
  "software",
  "engineering",
  "web",
  "data",
  "marketing",
  "business",
];

function scoreVerifiedRow(edu: NormalizedEduEntry): number {
  const courseLower = (edu.course ?? "").toLowerCase();
  return TECH_COURSE_KEYWORDS.some((kw) => courseLower.includes(kw)) ? 10 : 7;
}

function idOrder(id: number | null): number {
  return id ?? Number.POSITIVE_INFINITY;
}

export function evaluateEducation(profile: NormalizedProfile, context: MatchContext, weight: number): EvaluatorResult {
  const maxScore = 10;
  const verified = profile.education.filter((edu) => edu.status === "Verified");

  if (verified.length === 0) {
    const hasAnyEducation = profile.education.length > 0;
    return {
      factor: "EDUCATION",
      label: "Education",
      score: 3,
      maxScore,
      weight,
      evidence: [],
      strengths: [],
      weaknesses: [hasAnyEducation ? "No verified education records" : "No formal education listed"],
      explanationCode: "EDUCATION_NONE_VERIFIED",
      explanationMessage: hasAnyEducation
        ? "Education records exist but none are verified."
        : "No education records provided.",
    };
  }

  const best = verified.reduce<{ edu: NormalizedEduEntry; score: number }>(
    (acc, edu) => {
      const score = scoreVerifiedRow(edu);
      if (score > acc.score) return { edu, score };
      if (score < acc.score) return acc;
      return idOrder(edu.id) < idOrder(acc.edu.id) ? { edu, score } : acc;
    },
    { edu: verified[0], score: scoreVerifiedRow(verified[0]) },
  );

  const evidence: EvidenceItem[] = [
    {
      type: "EDUCATION",
      label: "Education Record",
      value: `${best.edu.course || "Degree"} ${best.edu.school ? `from ${best.edu.school}` : ""}`.trim(),
      scoreContribution: best.score,
    },
  ];

  return {
    factor: "EDUCATION",
    label: "Education",
    score: best.score,
    maxScore,
    weight,
    evidence,
    strengths: [`Education: ${best.edu.course || "Graduate"} (${best.edu.school || "University"})`],
    weaknesses: [],
    explanationCode: "EDUCATION_SCORED",
    explanationMessage: `Education score ${best.score}/10 for ${best.edu.course || "degree"}.`,
  };
}
