// src/modules/matching-engine/campus/runCampusMatch.ts
// Orchestrates the full campus matching pipeline for a single candidate:
// Eligibility → Evaluator → Evidence → Deterministic Result
// Gemini explanation is NOT called here; it is called at the API layer.

import {
  CampusCandidate,
  CampusMatchResult,
  CandidateEvidenceLevel,
  MatchModel,
  NormalizedJobRequirements,
} from "./types";
import { evaluateEligibility } from "./eligibilityFilter";
import { evaluateAcademicCandidate } from "./academicEvaluator";
import { evaluateHybridCandidate } from "./hybridEvaluator";

export function runCampusMatch(
  candidate: CampusCandidate,
  job: NormalizedJobRequirements
): CampusMatchResult {
  const eligibility = evaluateEligibility(candidate, job);

  // Ineligible candidates get score 0 and skip evaluation
  if (!eligibility.eligible) {
    return buildIneligibleResult(candidate, eligibility.reasons);
  }

  if (!candidate.isRegistered) {
    // ACADEMIC pipeline
    const { score, curriculumItems, gaps } = evaluateAcademicCandidate(candidate, job);

    return {
      candidateId: candidate.studentId,
      studentNumber: candidate.studentNumber,
      studentName: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
      courseName: candidate.courseName,
      schoolYear: candidate.schoolYear,
      gpa: candidate.gpa,
      isRegistered: false,
      registeredUserId: null,
      invitationStatus: candidate.invitationStatus,
      matchModel: "ACADEMIC" satisfies MatchModel,
      evidenceLevel: "ACADEMIC_ONLY" satisfies CandidateEvidenceLevel,
      score,
      eligibility,
      evidence: {
        curriculum: curriculumItems,
        verifiedSkills: [],
        experience: [],
        responsibilities: [],
      },
      gaps,
      explanation: null,
    };
  }

  // HYBRID pipeline
  const { score, curriculumItems, verifiedSkillItems, experienceItems, gaps } =
    evaluateHybridCandidate(candidate, job);

  const evidenceLevel: CandidateEvidenceLevel =
    candidate.verifiedSkills.length > 0
      ? "FULL_PROFILE"
      : "ACADEMIC_ENRICHED";

  return {
    candidateId: candidate.studentId,
    studentNumber: candidate.studentNumber,
    studentName: `${candidate.firstName} ${candidate.lastName}`,
    email: candidate.email,
    courseName: candidate.courseName,
    schoolYear: candidate.schoolYear,
    gpa: candidate.gpa,
    isRegistered: true,
    registeredUserId: candidate.registeredUserId,
    invitationStatus: candidate.invitationStatus,
    matchModel: "HYBRID" satisfies MatchModel,
    evidenceLevel,
    score,
    eligibility,
    evidence: {
      curriculum: curriculumItems,
      verifiedSkills: verifiedSkillItems,
      experience: experienceItems,
      responsibilities: [],
    },
    gaps,
    explanation: null,
  };
}

function buildIneligibleResult(
  candidate: CampusCandidate,
  reasons: string[]
): CampusMatchResult {
  return {
    candidateId: candidate.studentId,
    studentNumber: candidate.studentNumber,
    studentName: `${candidate.firstName} ${candidate.lastName}`,
    email: candidate.email,
    courseName: candidate.courseName,
    schoolYear: candidate.schoolYear,
    gpa: candidate.gpa,
    isRegistered: candidate.isRegistered,
    registeredUserId: candidate.isRegistered ? candidate.registeredUserId : null,
    invitationStatus: candidate.invitationStatus,
    matchModel: "ACADEMIC",
    evidenceLevel: "ACADEMIC_ONLY",
    score: 0,
    eligibility: { eligible: false, reasons },
    evidence: { curriculum: [], verifiedSkills: [], experience: [], responsibilities: [] },
    gaps: reasons.map((r) => ({
      requirementLabel: "Eligibility Requirement",
      type: "REQUIRED",
      status: "REQUIREMENT_FAILED",
      reason: r,
    })),
    explanation: null,
  };
}
