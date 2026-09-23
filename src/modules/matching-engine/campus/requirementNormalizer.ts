// src/modules/matching-engine/campus/requirementNormalizer.ts
// Extracts and classifies job requirements from a raw vs_job_posting record
// into REQUIRED | PREFERRED | NICE_TO_HAVE requirements.

import {
  JobRequirement,
  NormalizedJobRequirements,
} from "./types";

/** Minimal shape of a vs_job_posting record needed for normalization. */
export interface RawJobPosting {
  job_id: number;
  job_title: string;
  job_category: string;
  job_type: string;
  experience_level: string | null;
  education: string | null;
  job_description: string;
  job_responsibilities: string | null;
  job_qualifications: string;
  skills?: Array<{ skill_name: string; is_required?: number }>;
}

const EXPERIENCE_LEVEL_TO_YEARS: Record<string, number> = {
  ENTRY: 0,
  MID: 2,
  SENIOR: 5,
  MANAGER: 7,
  EXECUTIVE: 10,
};

/**
 * Parses raw job data and produces a classified list of requirements.
 * REQUIRED: hard dealbreakers used in the eligibility filter.
 * PREFERRED / NICE_TO_HAVE: influence the match score and gap list.
 */
export function normalizeJobRequirements(raw: RawJobPosting): NormalizedJobRequirements {
  const requirements: JobRequirement[] = [];

  // ── Education Requirement ─────────────────────────────────────────────────
  // Education in the job posting is always treated as REQUIRED because it is
  // an explicit field set by the recruiter.
  if (raw.education) {
    requirements.push({
      label: raw.education,
      type: "REQUIRED",
      category: "EDUCATION",
    });
  }

  // ── Experience Level ──────────────────────────────────────────────────────
  // ENTRY / INTERNSHIP — PREFERRED so graduating students are not disqualified.
  // SENIOR and above — REQUIRED to prevent clearly mismatched candidates.
  if (raw.experience_level) {
    const years = EXPERIENCE_LEVEL_TO_YEARS[raw.experience_level.toUpperCase()] ?? 0;
    const isHardExperience = years >= 5;
    requirements.push({
      label: `${raw.experience_level} level (approx. ${years}+ years)`,
      type: isHardExperience ? "REQUIRED" : "PREFERRED",
      category: "EXPERIENCE",
    });
  }

  // ── Skills (from vs_job_skills_map) ──────────────────────────────────────
  // Skills marked is_required = 1 by the recruiter are REQUIRED.
  // All others are PREFERRED.
  if (Array.isArray(raw.skills)) {
    for (const skill of raw.skills) {
      requirements.push({
        label: skill.skill_name,
        type: skill.is_required === 1 ? "REQUIRED" : "PREFERRED",
        category: "SKILL",
      });
    }
  }

  // ── Keyword-based extraction from qualifications text ─────────────────────
  // Parses natural language qualifications for certification mentions.
  const certKeywords = ["licensed", "certified", "prc", "certification", "board"];
  if (raw.job_qualifications) {
    const lower = raw.job_qualifications.toLowerCase();
    const hasCertReq = certKeywords.some((kw) => lower.includes(kw));
    if (hasCertReq) {
      requirements.push({
        label: "Professional certification or licensure",
        type: "PREFERRED",
        category: "CERTIFICATION",
      });
    }
  }

  return {
    jobId: raw.job_id,
    jobTitle: raw.job_title,
    jobCategory: raw.job_category,
    jobType: raw.job_type,
    experienceLevel: raw.experience_level,
    educationRequired: raw.education,
    requirements,
    responsibilitiesText: raw.job_responsibilities ?? "",
    qualificationsText: raw.job_qualifications,
  };
}
