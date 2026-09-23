// src/modules/matching-engine/campus/hybridEvaluator.ts
// Scores registered candidates with full profile data.
// Weights: Skills 35% | Exp/Projects 25% | Education 20% | Responsibilities 15% | GPA 5%

import {
  EnhancedCandidate,
  CampusEvidenceItem,
  DeterministicGap,
} from "./types";
import { NormalizedJobRequirements } from "./types";
import { resolveCurriculumDomain, resolveJobDomain } from "./curriculumTaxonomy";

const WEIGHTS = {
  skills: 35,
  experience: 25,
  education: 20,
  responsibilities: 15,
  gpa: 5,
};

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function skillOverlap(candidateSkills: string[], jobRequirements: string[]): number {
  if (jobRequirements.length === 0) return 0.6; // no skills listed — neutral
  const candidateSet = new Set(candidateSkills.map(normalizeStr));
  let matched = 0;
  for (const req of jobRequirements) {
    if (candidateSet.has(normalizeStr(req))) matched++;
  }
  return matched / jobRequirements.length;
}

export interface HybridEvaluationResult {
  score: number;
  curriculumItems: CampusEvidenceItem[];
  verifiedSkillItems: CampusEvidenceItem[];
  experienceItems: CampusEvidenceItem[];
  gaps: DeterministicGap[];
}

/**
 * Scores a registered (enhanced) candidate with explicit profile data.
 * Gaps are marked NOT_MATCHED (we have evidence but it does not satisfy the requirement)
 * or NOT_EVIDENCED when specific evidence was not found.
 */
export function evaluateHybridCandidate(
  candidate: EnhancedCandidate,
  job: NormalizedJobRequirements
): HybridEvaluationResult {
  const skillRequirements = job.requirements
    .filter((r) => r.category === "SKILL")
    .map((r) => r.label);

  // ── Skills (35%) ──────────────────────────────────────────────────────────
  const skillScore = skillOverlap(candidate.verifiedSkills, skillRequirements);

  // ── Experience (25%) ──────────────────────────────────────────────────────
  const targetYears =
    { ENTRY: 0, MID: 2, SENIOR: 5, MANAGER: 7, EXECUTIVE: 10 }[
      (job.experienceLevel ?? "ENTRY").toUpperCase()
    ] ?? 0;
  let expScore = 0;
  if (targetYears === 0) {
    expScore = 1.0; // any experience satisfies entry-level
  } else {
    expScore = Math.min(candidate.workExperienceYears / targetYears, 1.0);
  }

  // ── Education / Course Domain (20%) ───────────────────────────────────────
  const { domain: candidateDomain } = resolveCurriculumDomain(candidate.courseName);
  const jobDomain = resolveJobDomain(job.jobCategory, job.jobTitle);
  let eduScore = 0.5;
  if (candidateDomain && jobDomain) {
    eduScore = candidateDomain.domainKey === jobDomain.domainKey ? 1.0 : 0.4;
  }

  // ── Responsibility / Role Match (15%) ─────────────────────────────────────
  const summaryText = [
    candidate.profileHeadline ?? "",
    candidate.professionalSummary ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const responsibilityKeywords = job.responsibilitiesText
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);

  const respMatched = responsibilityKeywords.filter((kw) =>
    summaryText.includes(kw)
  ).length;
  const respScore =
    responsibilityKeywords.length > 0
      ? Math.min(respMatched / responsibilityKeywords.length, 1.0)
      : 0.5;

  // ── GPA (5% — secondary indicator) ────────────────────────────────────────
  let gpaScore = 0.5;
  if (candidate.gpa !== null) {
    gpaScore =
      candidate.gpa <= 5.0 && candidate.gpa >= 1.0
        ? Math.max(0, (5.0 - candidate.gpa) / 4.0)
        : Math.min(candidate.gpa / 4.0, 1.0);
  }

  // ── Composite Score ───────────────────────────────────────────────────────
  const raw =
    skillScore * WEIGHTS.skills +
    expScore * WEIGHTS.experience +
    eduScore * WEIGHTS.education +
    respScore * WEIGHTS.responsibilities +
    gpaScore * WEIGHTS.gpa;

  const score = Math.round(Math.min(Math.max(raw, 0), 100));

  // ── Curriculum Evidence (inferred) ────────────────────────────────────────
  const { competencies } = resolveCurriculumDomain(candidate.courseName);
  const curriculumItems: CampusEvidenceItem[] = competencies.map((comp) => ({
    label: comp,
    source: "CURRICULUM",
    verified: false,
  }));

  // ── Verified Skill Evidence ───────────────────────────────────────────────
  const verifiedSkillItems: CampusEvidenceItem[] = candidate.verifiedSkills.map(
    (sk) => ({
      label: sk,
      source: "USER_SKILL",
      verified: true,
    })
  );

  // ── Work Experience Evidence ──────────────────────────────────────────────
  const experienceItems: CampusEvidenceItem[] =
    candidate.workExperienceYears > 0
      ? [
          {
            label: `${candidate.workExperienceYears} year${candidate.workExperienceYears !== 1 ? "s" : ""} of work experience`,
            source: "WORK_EXPERIENCE",
            verified: true,
          },
        ]
      : [];

  // ── Deterministic Gaps ────────────────────────────────────────────────────
  const candidateSkillSet = new Set(
    candidate.verifiedSkills.map(normalizeStr)
  );
  const gaps: DeterministicGap[] = skillRequirements
    .filter((req) => !candidateSkillSet.has(normalizeStr(req)))
    .map((req) => {
      const requirement = job.requirements.find((r) => r.label === req);
      return {
        requirementLabel: req,
        type: requirement?.type ?? "PREFERRED",
        // We have a registered profile but the skill is simply not present
        status: "NOT_MATCHED" as const,
        reason: `${req} is not listed in the candidate's verified skills.`,
      };
    });

  return {
    score,
    curriculumItems,
    verifiedSkillItems,
    experienceItems,
    gaps,
  };
}
