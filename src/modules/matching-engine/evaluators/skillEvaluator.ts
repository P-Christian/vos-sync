// src/modules/matching-engine/evaluators/skillEvaluator.ts

import { NormalizedProfile } from "../types/profileTypes";
import { MatchContext, MatchMode } from "../types/matchTypes";
import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";

export function evaluateSkills(profile: NormalizedProfile, context: MatchContext, weight: number): EvaluatorResult {
  const maxScore = 45;
  const explicitSkills = context.requestedSkills ?? [];
  const candidateSkillsLower = profile.skills.map((s) => s.toLowerCase());

  // ── SKILL_MATCH & JOB_MATCH MODE: Explicit Checklist Evaluation ──
  if (context.mode === MatchMode.SKILL_MATCH || context.mode === MatchMode.JOB_MATCH || explicitSkills.length > 0) {
    const matchedSkills = explicitSkills.filter((s) => candidateSkillsLower.includes(s.toLowerCase()));
    const missingSkills = explicitSkills.filter((s) => !candidateSkillsLower.includes(s.toLowerCase()));

    const matchRatio = explicitSkills.length > 0 ? matchedSkills.length / explicitSkills.length : 1.0;
    const rawScore = Math.round(matchRatio * maxScore);

    const evidence: EvidenceItem[] = matchedSkills.map((s) => ({
      type: "SKILL",
      label: "Matched Skill",
      value: s,
      scoreContribution: Math.round(maxScore / explicitSkills.length),
    }));

    const strengths = matchedSkills.length > 0 ? [`Matched skills: ${matchedSkills.join(", ")}`] : [];
    const weaknesses = missingSkills.length > 0 ? [`Missing requested skills: ${missingSkills.join(", ")}`] : [];

    return {
      factor: "SKILLS",
      label: "Skills Coverage",
      score: rawScore,
      maxScore,
      weight,
      evidence,
      strengths,
      weaknesses,
      explanationCode: "SKILLS_CHECKLIST",
      explanationMessage: `Matched ${matchedSkills.length} of ${explicitSkills.length} requested skills.`,
    };
  }

  // ── ROLE_SIMILARITY / BROWSE MODE: Reward-Only Skills Bonus (Zero Penalty!) ──
  let bonusScore = 0;
  if (profile.skills.length >= 5) {
    bonusScore = 15;
  } else if (profile.skills.length >= 3) {
    bonusScore = 12;
  } else if (profile.skills.length >= 1) {
    bonusScore = 8;
  } else {
    bonusScore = 0;
  }

  const evidence: EvidenceItem[] = profile.skills.slice(0, 4).map((s) => ({
    type: "SKILL",
    label: "Known Skill",
    value: s,
    scoreContribution: Number((bonusScore / Math.max(1, profile.skills.length)).toFixed(1)),
  }));

  return {
    factor: "SKILLS",
    label: "Skills Bonus",
    score: bonusScore,
    maxScore: 15,
    weight,
    evidence,
    strengths: profile.skills.length > 0 ? [`Strong skill profile (${profile.skills.slice(0, 5).join(", ")})`] : [],
    weaknesses: profile.skills.length === 0 ? ["No skills listed in profile"] : [],
    explanationCode: "SKILLS_BONUS",
    explanationMessage: `Earned ${bonusScore}/15 skills bonus for ${profile.skills.length} skills.`,
  };
}
