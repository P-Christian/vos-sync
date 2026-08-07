// src/modules/matching-engine/evaluators/certificationEvaluator.ts

import { NormalizedProfile } from "../types/profileTypes";
import { MatchContext } from "../types/matchTypes";
import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";

export function evaluateCertifications(profile: NormalizedProfile, context: MatchContext, weight: number): EvaluatorResult {
  const maxScore = 10;
  if (profile.certifications.length === 0) {
    return {
      factor: "CERTIFICATIONS",
      label: "Certifications",
      score: 0,
      maxScore,
      weight,
      evidence: [],
      strengths: [],
      weaknesses: [],
      explanationCode: "CERTS_NONE",
      explanationMessage: "No certifications listed.",
    };
  }

  const certCount = profile.certifications.length;
  const rawScore = Math.min(10, certCount * 5);

  const evidence: EvidenceItem[] = profile.certifications.map((c) => ({
    type: "CERTIFICATION",
    label: "Certification",
    value: `${c.name} ${c.issuer ? `(${c.issuer})` : ""}`.trim(),
    scoreContribution: 5,
  }));

  return {
    factor: "CERTIFICATIONS",
    label: "Certifications",
    score: rawScore,
    maxScore,
    weight,
    evidence,
    strengths: [`${certCount} professional certification(s) verified`],
    weaknesses: [],
    explanationCode: "CERTS_SCORED",
    explanationMessage: `Earned ${rawScore}/10 for ${certCount} certification(s).`,
  };
}
