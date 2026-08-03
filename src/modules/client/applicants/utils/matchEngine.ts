import { JobPosting } from "../../jobs/types";
import { Applicant } from "../types";
import { calculateGlobalSkillMatch } from "@/lib/skill-matcher";

export interface MatchBreakdown {
  overall: number;
  skills: number;
  experience: number;
  education: number;
  location: number;
  screening: number;
}

export interface RelatedSkillMatch {
  requiredSkill: string;
  candidateSkill: string;
  matchTier: string;
  reason: string;
  score: number;
}

export interface MatchResult {
  overallScore: number;
  breakdown: MatchBreakdown;
  matchingSkills: string[];
  relatedSkills: RelatedSkillMatch[];
  missingSkills: string[];
  badge: {
    label: string;
    description: string;
    variant: "highly_recommended" | "good_match" | "potential_match";
  };
}

/**
 * Calculates a match score and explanation between a job posting and a candidate.
 */
export function calculateMatch(job: JobPosting, applicant: Applicant): MatchResult {
  // 1. Skills Match (40% weight) via Global Rule-Based Skill Engine
  const jobSkills = job.skills ?? [];
  const candidateSkills = applicant.skills ?? [];

  const skillAnalysis = calculateGlobalSkillMatch(jobSkills, candidateSkills);
  const skillsScore = skillAnalysis.skillScore;

  const matchingSkills: string[] = [];
  const relatedSkills: RelatedSkillMatch[] = [];
  const missingSkills: string[] = [];

  for (const detail of skillAnalysis.matchDetails) {
    if (detail.matchTier === "EXACT" || detail.matchTier === "ALIAS") {
      matchingSkills.push(detail.requiredSkill);
    } else if (
      (detail.matchTier === "RELATION" || detail.matchTier === "HIERARCHY" || detail.matchTier === "CATEGORY") &&
      detail.matchedCandidateSkill
    ) {
      relatedSkills.push({
        requiredSkill: detail.requiredSkill,
        candidateSkill: detail.matchedCandidateSkill,
        matchTier: detail.matchTier,
        reason: detail.reason,
        score: detail.score,
      });
    } else {
      missingSkills.push(detail.requiredSkill);
    }
  }

  // 2. Experience Match (25% weight)
  // Map job experience_level to target years of experience
  // ENTRY: 0-2 yrs, MID: 2-5 yrs, SENIOR: 5-8 yrs, MANAGER: 8+ yrs, EXECUTIVE: 10+ yrs
  const requiredLevel = job.experience_level || "ENTRY";
  const years = applicant.experience_years ?? 0;
  let experienceScore = 100;

  if (requiredLevel === "MID") {
    experienceScore = years >= 2 ? 100 : Math.round((years / 2) * 100);
  } else if (requiredLevel === "SENIOR") {
    experienceScore = years >= 5 ? 100 : Math.round((years / 5) * 100);
  } else if (requiredLevel === "MANAGER") {
    experienceScore = years >= 8 ? 100 : Math.round((years / 8) * 100);
  } else if (requiredLevel === "EXECUTIVE") {
    experienceScore = years >= 10 ? 100 : Math.round((years / 10) * 100);
  } else {
    // ENTRY
    experienceScore = 100;
  }

  // 3. Location Match (15% weight)
  // Remote arragement = 100% match.
  // Otherwise compare job location vs candidate city/province
  const isRemote = job.work_arrangement?.toLowerCase() === "remote" || 
                   job.job_location?.toLowerCase() === "remote";
  
  let locationScore = 100;
  if (!isRemote) {
    const jobLoc = (job.job_location || "").toLowerCase().trim();
    
    // In our modified API we will pass applicant_city / applicant_province to applicant
    // E.g., applicant.location = "City, Province"
    const applicantLoc = applicant.location ? String(applicant.location).toLowerCase() : "";
    
    if (jobLoc && applicantLoc) {
      const isMatch = applicantLoc.includes(jobLoc) || jobLoc.includes(applicantLoc);
      locationScore = isMatch ? 100 : 70;
    } else {
      locationScore = 85; // Default moderate match if one is missing
    }
  }

  // 4. Education Match (10% weight)
  // Candidate education info will be attached dynamically.
  // If job has no education requirements, 100%.
  // Otherwise if candidate has education records matching keywords, 100%.
  const reqEducation = (job.education || "").toLowerCase();
  let educationScore = 100;

  if (reqEducation && reqEducation !== "any" && reqEducation !== "none") {
    // If candidate has education info
    const candidateEduName = (applicant.education_school || "").toLowerCase();
    const candidateEduCourse = (applicant.education_course || "").toLowerCase();
    
    if (candidateEduName || candidateEduCourse) {
      const hasDegree = reqEducation.includes("bachelor") ? 
        (candidateEduCourse.includes("bachelor") || candidateEduCourse.includes("bs") || candidateEduCourse.includes("ab") || candidateEduCourse.includes("college")) : true;
      
      educationScore = hasDegree ? 100 : 80;
    } else {
      educationScore = 50; // No education profile info provided but required
    }
  }

  // 5. Screening Match (10% weight)
  // Number of screening answers provided.
  // In job posting, we might have screening_questions: string[]
  // In applicant, we might have screening_answers count
  let screeningScore = 100;
  const totalQuestions = job.screening_questions?.length ?? 0;
  if (totalQuestions > 0) {
    // Compare applicant's answers count
    const answersCount = applicant.screening_answers_count ?? 0;
    screeningScore = Math.round((answersCount / totalQuestions) * 100);
  }

  // 6. Overall Match Calculation (Weighted Average)
  const overallScore = Math.round(
    (skillsScore * 0.40) +
    (experienceScore * 0.25) +
    (locationScore * 0.15) +
    (educationScore * 0.10) +
    (screeningScore * 0.10)
  );

  // 7. AI Recommendation Badge Selection
  let badge: MatchResult["badge"] = {
    label: "Potential Match",
    description: "Consider evaluating for general compatibility.",
    variant: "potential_match"
  };

  if (overallScore >= 85) {
    badge = {
      label: "Highly Recommended",
      description: "Strong skill alignment. Meets required experience. Located near workplace.",
      variant: "highly_recommended"
    };
  } else if (overallScore >= 70) {
    let desc = "Has most required skills.";
    if (missingSkills.length > 0) {
      desc += ` Needs ${missingSkills[0]} experience.`;
    }
    badge = {
      label: "Good Match",
      description: desc,
      variant: "good_match"
    };
  } else {
    badge = {
      label: "Potential Match",
      description: "Needs development in core technical skills required for this job.",
      variant: "potential_match"
    };
  }

  return {
    overallScore,
    breakdown: {
      overall: overallScore,
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      location: locationScore,
      screening: screeningScore
    },
    matchingSkills,
    relatedSkills,
    missingSkills,
    badge
  };
}
