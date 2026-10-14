// src/modules/client/campus-talent/utils/skillClassifier.ts
// Intelligent classification of candidate skills and curriculum competencies into Technical vs Soft skills.

import { CampusEvidenceItem } from "@/modules/matching-engine/campus/types";

export interface ClassifiedSkills {
  technicalSkills: string[];
  softSkills: string[];
}

export interface ClassifiedEvidence {
  technical: CampusEvidenceItem[];
  soft: CampusEvidenceItem[];
}

const SOFT_SKILLS_SET = new Set([
  "communication",
  "verbal communication",
  "written communication",
  "leadership",
  "team leadership",
  "team management",
  "people management",
  "mentoring",
  "coaching",
  "teamwork",
  "collaboration",
  "cross-functional collaboration",
  "interpersonal skills",
  "interpersonal communication",
  "problem solving",
  "critical thinking",
  "analytical thinking",
  "decision making",
  "troubleshooting",
  "time management",
  "organization",
  "organizational skills",
  "multitasking",
  "adaptability",
  "flexibility",
  "resilience",
  "work ethic",
  "professionalism",
  "emotional intelligence",
  "empathy",
  "conflict resolution",
  "negotiation",
  "active listening",
  "public speaking",
  "presentation",
  "presentation skills",
  "creativity",
  "creative thinking",
  "strategic thinking",
  "attention to detail",
  "customer service",
  "client relations",
  "stakeholder management",
  "project management",
  "project planning",
  "agile",
  "scrum",
  "ethics",
  "integrity",
  "initiative",
  "self-starter",
  "client & customer management",
  "healthcare ethics & compliance",
  "community engagement & outreach",
  "behavioral assessment & reporting",
]);

const SOFT_SKILL_PATTERNS: RegExp[] = [
  /\b(communication|communicative|speaking|presentation|listening)\b/i,
  /\b(leadership|leader|management|mentor|mentoring|coaching|supervising)\b/i,
  /\b(teamwork|team player|collaboration|collaborative|interpersonal|partnering)\b/i,
  /\b(problem[- ]solving|critical thinking|decision[- ]making)\b/i,
  /\b(time management|organization|organizational|prioritization|multitasking)\b/i,
  /\b(adaptability|adaptive|flexible|flexibility|resilience|dependability)\b/i,
  /\b(emotional intelligence|empathy|conflict|negotiation|relationship)\b/i,
  /\b(creativity|creative|innovative|innovation)\b/i,
  /\b(customer service|client relations|outreach|stakeholder)\b/i,
  /\b(work ethic|integrity|ethics|detail[- ]oriented)\b/i,
];

/**
 * Checks whether a given skill or competency string represents a soft skill.
 */
export function isSoftSkill(skillName: string): boolean {
  if (!skillName || typeof skillName !== "string") return false;
  const normalized = skillName.trim().toLowerCase();

  if (SOFT_SKILLS_SET.has(normalized)) return true;

  for (const pattern of SOFT_SKILL_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }

  return false;
}

/**
 * Classifies an array of skill strings into distinct technical and soft skill lists.
 */
export function classifySkillNames(skills: string[]): ClassifiedSkills {
  const technicalSkills: string[] = [];
  const softSkills: string[] = [];

  const seen = new Set<string>();

  for (const skill of skills) {
    if (!skill || typeof skill !== "string") continue;
    const clean = skill.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    if (isSoftSkill(clean)) {
      softSkills.push(clean);
    } else {
      technicalSkills.push(clean);
    }
  }

  return { technicalSkills, softSkills };
}

/**
 * Classifies CampusEvidenceItem records into technical and soft evidence items.
 */
export function classifyEvidenceItems(items: CampusEvidenceItem[]): ClassifiedEvidence {
  const technical: CampusEvidenceItem[] = [];
  const soft: CampusEvidenceItem[] = [];

  for (const item of items) {
    if (isSoftSkill(item.label)) {
      soft.push(item);
    } else {
      technical.push(item);
    }
  }

  return { technical, soft };
}
