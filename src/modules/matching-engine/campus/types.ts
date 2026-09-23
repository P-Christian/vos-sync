// src/modules/matching-engine/campus/types.ts
// Isolated types for the Campus Talent matching domain.
// No changes are made to the existing matching-engine types.

// ── Candidate Models ─────────────────────────────────────────────────────────

/**
 * Determines which evaluation pipeline is applied.
 * ACADEMIC: roster-only — vs_school_student has no registered_user_id.
 * HYBRID:   academic + registered vs_user profile enrichment.
 */
export type MatchModel = "ACADEMIC" | "HYBRID";

/**
 * Describes the richness of the candidate evidence base.
 */
export type CandidateEvidenceLevel =
  | "ACADEMIC_ONLY"
  | "ACADEMIC_ENRICHED"
  | "FULL_PROFILE";

// ── Academic (Roster-Only) Candidate ─────────────────────────────────────────

export interface AcademicCandidate {
  studentId: number;
  studentNumber: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  schoolId: number;
  schoolName: string;
  courseName: string | null;
  courseCode: string | null;
  degree: "Associate" | "Bachelor" | "Master" | "Doctorate" | null;
  schoolYear: string;
  gpa: number | null;
  isRegistered: false;
  registeredUserId: null;
  invitationStatus: string;
}

// ── Enhanced (Registered) Candidate ──────────────────────────────────────────

export interface EnhancedCandidate extends Omit<AcademicCandidate, "isRegistered" | "registeredUserId"> {
  isRegistered: true;
  registeredUserId: number;
  profileHeadline: string | null;
  professionalSummary: string | null;
  verifiedSkills: string[];
  workExperienceYears: number;
  hasResume: boolean;
  certifications: string[];
}

export type CampusCandidate = AcademicCandidate | EnhancedCandidate;

// ── Job Requirement Model ─────────────────────────────────────────────────────

export interface JobRequirement {
  label: string;
  type: "REQUIRED" | "PREFERRED" | "NICE_TO_HAVE";
  category: "EDUCATION" | "EXPERIENCE" | "SKILL" | "CERTIFICATION" | "OTHER";
}

export interface NormalizedJobRequirements {
  jobId: number;
  jobTitle: string;
  jobCategory: string;
  jobType: string;
  experienceLevel: string | null;
  educationRequired: string | null;
  requirements: JobRequirement[];
  responsibilitiesText: string;
  qualificationsText: string;
}

// ── Evidence & Gap Model ──────────────────────────────────────────────────────

export type EvidenceSource =
  | "CURRICULUM"
  | "USER_SKILL"
  | "RESUME"
  | "WORK_EXPERIENCE"
  | "PROJECT"
  | "CERTIFICATION";

export interface CampusEvidenceItem {
  label: string;
  source: EvidenceSource;
  verified: boolean;
}

/**
 * NOT_EVIDENCED: The candidate's data does not contain information about this requirement
 *   (common for unregistered students). Cannot conclude it is absent — just unavailable.
 * NOT_MATCHED: Evidence exists but does not satisfy the requirement.
 * REQUIREMENT_FAILED: A hard REQUIRED constraint was not satisfied — triggers ineligibility.
 */
export type GapStatus = "NOT_EVIDENCED" | "NOT_MATCHED" | "REQUIREMENT_FAILED";

export interface DeterministicGap {
  requirementLabel: string;
  type: "REQUIRED" | "PREFERRED" | "NICE_TO_HAVE";
  status: GapStatus;
  reason: string;
}

// ── Eligibility Result ────────────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  /** Human-readable reasons for ineligibility (empty when eligible). */
  reasons: string[];
}

// ── Full Campus Match Result ──────────────────────────────────────────────────

export interface CampusMatchResult {
  candidateId: number;
  studentNumber: string | null;
  studentName: string;
  email: string;
  courseName: string | null;
  schoolYear: string;
  gpa: number | null;
  isRegistered: boolean;
  registeredUserId: number | null;
  invitationStatus: string;

  matchModel: MatchModel;
  evidenceLevel: CandidateEvidenceLevel;
  /** Deterministic score (0–100). Gemini does NOT modify this value. */
  score: number;

  eligibility: EligibilityResult;

  evidence: {
    curriculum: CampusEvidenceItem[];
    verifiedSkills: CampusEvidenceItem[];
    experience: CampusEvidenceItem[];
    responsibilities: CampusEvidenceItem[];
  };

  /** Deterministically established gaps. Gemini may only explain these; it cannot add new entries. */
  gaps: DeterministicGap[];

  /** Populated after Gemini explainer runs. Null if Gemini is unavailable or candidate is ineligible. */
  explanation: CampusMatchExplanation | null;
}

// ── Gemini Explanation Output (Strict JSON Schema) ────────────────────────────

export interface CampusMatchExplanation {
  summary: string;
  strengths: string[];
  /** Competencies inferred from academic curriculum — NOT verified skills. */
  inferredCompetencies: string[];
  /** Only populated when registeredUserId is set and skills exist in vs_user_skills_map. */
  verifiedSkillsSummary: string[];
  /** Gemini's narrative explanation of the deterministic gaps. No new gaps may be added. */
  gapAnalysis: string[];
  confidence: CandidateEvidenceLevel;
}

// ── Invitation Types ──────────────────────────────────────────────────────────

export type CampusInvitationStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "OPENED"
  | "REGISTERED"
  | "APPLIED"
  | "EXPIRED";

export interface CampusInvitationPayload {
  studentId: number;
  schoolId: number;
  jobId: number;
  companyId: number;
  recipientEmail: string;
  recipientName: string;
  schoolName: string;
  courseName: string | null;
  jobTitle: string;
  companyName: string;
  recruiterId: number;
}
