// src/modules/matching-engine/campus/curriculumTaxonomy.ts
// Data-driven competency vocabulary shared by job requirement normalization
// and academic degree classification. This replaces all brittle
// course.includes("Information Technology") checks.

export interface CompetencyDomain {
  domainKey: string;
  domainLabel: string;
  competencies: string[];
  /** Lowercase substrings found in course names that suggest this domain. */
  courseKeywords: string[];
  /** Job category codes that naturally align with this domain. */
  jobCategoryCodes: string[];
}

export const CURRICULUM_TAXONOMY: CompetencyDomain[] = [
  {
    domainKey: "COMPUTING",
    domainLabel: "Computing & Information Technology",
    courseKeywords: [
      "information technology",
      "computer science",
      "information systems",
      "computer engineering",
      "software engineering",
      "data science",
      "cybersecurity",
      "network",
    ],
    jobCategoryCodes: ["SOFTWARE_DEV", "IT", "DATA", "CYBERSEC", "DEVOPS"],
    competencies: [
      "Programming Fundamentals",
      "Database Systems & SQL",
      "Web Development",
      "Systems Architecture & Networking",
      "Algorithms & Data Structures",
      "Software Development Lifecycle",
      "Systems Analysis & Design",
      "Object-Oriented Programming",
    ],
  },
  {
    domainKey: "ENGINEERING",
    domainLabel: "Engineering & Applied Sciences",
    courseKeywords: [
      "electronics",
      "electrical engineering",
      "mechanical engineering",
      "civil engineering",
      "industrial engineering",
      "chemical engineering",
    ],
    jobCategoryCodes: ["ENGINEERING", "MANUFACTURING", "CONSTRUCTION"],
    competencies: [
      "Technical Mathematics & Analysis",
      "CAD & System Design",
      "Engineering Project Planning",
      "Quality Control & Assurance",
      "Technical Documentation",
    ],
  },
  {
    domainKey: "BUSINESS",
    domainLabel: "Business & Management",
    courseKeywords: [
      "business administration",
      "management",
      "marketing",
      "accountancy",
      "accounting",
      "finance",
      "economics",
      "entrepreneurship",
      "human resource",
    ],
    jobCategoryCodes: ["FINANCE", "ACCOUNTING", "MARKETING", "OPERATIONS", "HR"],
    competencies: [
      "Financial Analysis & Reporting",
      "Marketing Strategy & Communications",
      "Business Process Operations",
      "Client & Customer Management",
      "Project Management Fundamentals",
    ],
  },
  {
    domainKey: "MEDIA_ARTS",
    domainLabel: "Media, Arts & Design",
    courseKeywords: [
      "multimedia",
      "graphic design",
      "communication",
      "film",
      "journalism",
      "advertising",
      "fine arts",
      "architecture",
      "interior design",
    ],
    jobCategoryCodes: ["DESIGN", "MEDIA", "CONTENT", "MARKETING"],
    competencies: [
      "Visual & UI/UX Design Principles",
      "Content Creation & Copywriting",
      "Digital Media Production",
      "Brand & Identity Communication",
    ],
  },
  {
    domainKey: "HEALTH",
    domainLabel: "Health Sciences & Medicine",
    courseKeywords: [
      "nursing",
      "medicine",
      "pharmacy",
      "medical technology",
      "physical therapy",
      "dentistry",
      "nutrition",
      "radiologic",
      "health",
    ],
    jobCategoryCodes: ["HEALTHCARE", "MEDICAL", "NURSING"],
    competencies: [
      "Patient Care & Assessment",
      "Clinical Documentation",
      "Medical Terminology & Procedures",
      "Healthcare Ethics & Compliance",
    ],
  },
  {
    domainKey: "EDUCATION",
    domainLabel: "Education & Social Sciences",
    courseKeywords: [
      "education",
      "psychology",
      "social work",
      "sociology",
      "political science",
      "public administration",
    ],
    jobCategoryCodes: ["EDUCATION", "SOCIAL_SERVICES", "GOVERNMENT"],
    competencies: [
      "Instructional Design & Facilitation",
      "Behavioral Assessment & Reporting",
      "Community Engagement & Outreach",
      "Research & Data Interpretation",
    ],
  },
];

/**
 * Resolves a course name to its curriculum domain and inferred competencies.
 * Falls back to an empty array when the course cannot be classified.
 */
export function resolveCurriculumDomain(
  courseName: string | null
): { domain: CompetencyDomain | null; competencies: string[] } {
  if (!courseName) return { domain: null, competencies: [] };

  const normalized = courseName.toLowerCase();

  for (const domain of CURRICULUM_TAXONOMY) {
    const matched = domain.courseKeywords.some((kw) => normalized.includes(kw));
    if (matched) {
      return { domain, competencies: domain.competencies };
    }
  }

  return { domain: null, competencies: [] };
}

/**
 * Resolves a job category code or job title to its best-match domain.
 */
export function resolveJobDomain(
  jobCategoryCode: string | null,
  jobTitle: string
): CompetencyDomain | null {
  if (jobCategoryCode) {
    const byCode = CURRICULUM_TAXONOMY.find((d) =>
      d.jobCategoryCodes.includes(jobCategoryCode.toUpperCase())
    );
    if (byCode) return byCode;
  }

  const normalizedTitle = jobTitle.toLowerCase();
  for (const domain of CURRICULUM_TAXONOMY) {
    const matched = domain.courseKeywords.some((kw) =>
      normalizedTitle.includes(kw)
    );
    if (matched) return domain;
  }

  return null;
}
