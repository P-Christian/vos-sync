// src/modules/matching-engine/evaluators/educationEvaluator.ts

import { NormalizedProfile } from "../types/profileTypes";
import { MatchContext } from "../types/matchTypes";
import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";

export function evaluateEducation(profile: NormalizedProfile, context: MatchContext, weight: number): EvaluatorResult {
  const maxScore = 10;
  if (profile.education.length === 0) {
    return {
      factor: "EDUCATION",
      label: "Education",
      score: 3,
      maxScore,
      weight,
      evidence: [],
      strengths: [],
      weaknesses: ["No formal education listed"],
      explanationCode: "EDUCATION_NONE",
      explanationMessage: "No education records provided.",
    };
  }

  const techCourses = ["computer science", "information technology", "software", "engineering", "web", "data", "marketing", "business"];
  const edu = profile.education[0];
  const courseLower = (edu.course || "").toLowerCase();

  const isTech = techCourses.some((kw) => courseLower.includes(kw));
  const rawScore = isTech ? 10 : 7;

  const evidence: EvidenceItem[] = [
    {
      type: "EDUCATION",
      label: "Education Record",
      value: `${edu.course || "Degree"} ${edu.school ? `from ${edu.school}` : ""}`.trim(),
      scoreContribution: rawScore,
    },
  ];

  return {
    factor: "EDUCATION",
    label: "Education",
    score: rawScore,
    maxScore,
    weight,
    evidence,
    strengths: [`Education: ${edu.course || "Graduate"} (${edu.school || "University"})`],
    weaknesses: [],
    explanationCode: "EDUCATION_SCORED",
    explanationMessage: `Education score ${rawScore}/10 for ${edu.course || "degree"}.`,
  };
}
