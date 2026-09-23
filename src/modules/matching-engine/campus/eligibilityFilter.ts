// src/modules/matching-engine/campus/eligibilityFilter.ts
// Evaluates hard REQUIRED constraints only. PREFERRED and NICE_TO_HAVE
// requirements do not affect eligibility; they influence score and gaps.

import { CampusCandidate, EligibilityResult, NormalizedJobRequirements } from "./types";
import { resolveCurriculumDomain } from "./curriculumTaxonomy";

const DOMAIN_SPECIFIC_DEGREES: Record<string, string[]> = {
  HEALTH: ["nursing", "medicine", "pharmacy", "medical", "dentistry", "physical therapy", "radiologic", "nutrition"],
  EDUCATION: ["education", "teacher", "pedagogy"],
  LAW: ["law", "legal", "jurisprudence"],
};

/**
 * Checks whether the candidate's course/degree satisfies a REQUIRED
 * education constraint. Returns true if the candidate is eligible.
 *
 * Important: We are permissive by design here. If the course/education
 * requirement cannot be definitively matched to a restrictive domain,
 * we pass the candidate through and let the matching engine score them
 * lower rather than blocking them entirely.
 */
function checkEducationEligibility(
  candidate: CampusCandidate,
  educationRequired: string | null
): { eligible: boolean; reason: string | null } {
  if (!educationRequired) return { eligible: true, reason: null };

  const eduNorm = educationRequired.toLowerCase();

  // Check for strict domain-specific degree requirements
  for (const [domain, keywords] of Object.entries(DOMAIN_SPECIFIC_DEGREES)) {
    const requiresSpecificDomain = keywords.some((kw) => eduNorm.includes(kw));
    if (!requiresSpecificDomain) continue;

    const courseName = candidate.courseName?.toLowerCase() ?? "";
    const candidateMatchesDomain = keywords.some((kw) => courseName.includes(kw));

    if (!candidateMatchesDomain) {
      return {
        eligible: false,
        reason: `Job requires a ${domain}-specific degree (${educationRequired}). Candidate's course (${candidate.courseName ?? "Unknown"}) does not satisfy this requirement.`,
      };
    }
  }

  return { eligible: true, reason: null };
}

/**
 * Checks whether a SENIOR/MANAGER/EXECUTIVE experience requirement
 * would be a dealbreaker for an academic-only candidate.
 */
function checkExperienceEligibility(
  candidate: CampusCandidate,
  experienceLevel: string | null
): { eligible: boolean; reason: string | null } {
  if (!experienceLevel) return { eligible: true, reason: null };

  const seniorLevels = ["SENIOR", "MANAGER", "EXECUTIVE", "LEAD"];
  if (!seniorLevels.includes(experienceLevel.toUpperCase())) {
    return { eligible: true, reason: null };
  }

  // Enhanced candidates with work experience pass through
  if (candidate.isRegistered && candidate.workExperienceYears >= 3) {
    return { eligible: true, reason: null };
  }

  return {
    eligible: false,
    reason: `Job requires ${experienceLevel}-level experience. Roster students and early-career candidates do not meet this threshold.`,
  };
}

/**
 * Evaluates whether a candidate passes all REQUIRED hard constraints.
 * PREFERRED and NICE_TO_HAVE requirements are excluded from this check.
 */
export function evaluateEligibility(
  candidate: CampusCandidate,
  job: NormalizedJobRequirements
): EligibilityResult {
  const failReasons: string[] = [];

  // 1. Education check
  const eduCheck = checkEducationEligibility(candidate, job.educationRequired);
  if (!eduCheck.eligible && eduCheck.reason) {
    failReasons.push(eduCheck.reason);
  }

  // 2. Experience level check
  const expCheck = checkExperienceEligibility(candidate, job.experienceLevel);
  if (!expCheck.eligible && expCheck.reason) {
    failReasons.push(expCheck.reason);
  }

  // 3. Any remaining REQUIRED items that could not be satisfied
  const requiredSkills = job.requirements.filter(
    (r) => r.type === "REQUIRED" && r.category === "SKILL"
  );

  if (requiredSkills.length > 0 && !candidate.isRegistered) {
    // Unregistered students cannot evidence REQUIRED skills — they are flagged
    // as NOT_EVIDENCED in the gap builder but do not automatically disqualify.
    // We only block if there is a 100% clear domain mismatch (handled above).
    // This preserves curriculum-domain candidates from being swept away.
    const { domain } = resolveCurriculumDomain(candidate.courseName);
    if (!domain) {
      // Cannot classify the course at all — flag as low-confidence only, no block
    }
  }

  return {
    eligible: failReasons.length === 0,
    reasons: failReasons,
  };
}
