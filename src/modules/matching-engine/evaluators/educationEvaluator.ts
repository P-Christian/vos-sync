import { NormalizedProfile, NormalizedEduEntry } from "../types/profileTypes";
import { MatchContext } from "../types/matchTypes";
import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";
import { matchSchool } from "../retrieval/schoolMatcher";
import { cleanText } from "../normalizers/textNormalizer";
import { computeTokenOverlapScore } from "../retrieval/tokenMatcher";

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
  const rawKeyword = context.keyword?.trim() ?? "";

  // Check if search keyword matches candidate's school or degree
  if (rawKeyword) {
    for (const edu of profile.education) {
      if (edu.school) {
        const schoolMatch = matchSchool(rawKeyword, edu.school);
        if (schoolMatch.matched) {
          const evidence: EvidenceItem[] = [
            {
              type: "EDUCATION",
              label: "School Match",
              value: `Attended '${edu.school}'${edu.status === "Verified" ? " (Verified)" : ""}`,
              scoreContribution: maxScore,
            },
          ];
          return {
            factor: "EDUCATION",
            label: "Education",
            score: maxScore,
            maxScore,
            weight,
            evidence,
            strengths: [`Attended searched institution: ${edu.school}`],
            weaknesses: [],
            explanationCode: "EDUCATION_SCHOOL_MATCH",
            explanationMessage: `Candidate attended '${edu.school}', matching search for '${rawKeyword}'.`,
          };
        }
      }

      if (edu.course) {
        const courseClean = cleanText(edu.course);
        const queryClean = cleanText(rawKeyword);
        if (
          courseClean.includes(queryClean) ||
          computeTokenOverlapScore(queryClean, courseClean) >= 0.6
        ) {
          const evidence: EvidenceItem[] = [
            {
              type: "EDUCATION",
              label: "Course Match",
              value: `Studied '${edu.course}'${edu.status === "Verified" ? " (Verified)" : ""}`,
              scoreContribution: maxScore,
            },
          ];
          return {
            factor: "EDUCATION",
            label: "Education",
            score: maxScore,
            maxScore,
            weight,
            evidence,
            strengths: [`Studied searched course: ${edu.course}`],
            weaknesses: [],
            explanationCode: "EDUCATION_COURSE_MATCH",
            explanationMessage: `Candidate studied '${edu.course}', matching search for '${rawKeyword}'.`,
          };
        }
      }
    }
  }

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
