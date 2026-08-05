// src/app/api/client/talent-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

const ROLE_MAP: Record<string, string[]> = {
  marketing: [
    "social media",
    "social media strategist",
    "social media creator",
    "social media manager",
    "social media specialist",
    "content creator",
    "content strategist",
    "digital marketer",
    "copywriter",
    "seo specialist",
    "growth marketer",
  ],
  frontend: [
    "frontend",
    "react",
    "vue",
    "angular",
    "ui engineer",
    "web developer",
    "front-end",
    "front end",
    "javascript",
    "next.js",
    "nextjs",
    "typescript",
  ],
  backend: [
    "backend",
    "software engineer",
    "api developer",
    "python",
    "java",
    "node",
    "nodejs",
    "golang",
    "php",
    "back-end",
    "back end",
    "c#",
    ".net",
    "spring",
  ],
  fullstack: [
    "full stack",
    "fullstack",
    "software engineer",
    "web developer",
    "developer",
  ],
  mobile: [
    "mobile",
    "ios",
    "android",
    "react native",
    "flutter",
    "swift",
    "kotlin",
  ],
  devops: [
    "devops",
    "cloud",
    "site reliability",
    "sre",
    "infrastructure",
    "sysadmin",
    "aws",
    "azure",
    "kubernetes",
  ],
  data: [
    "data engineer",
    "data scientist",
    "data analyst",
    "machine learning",
    "ai engineer",
    "sql",
  ],
  qa: [
    "qa",
    "quality assurance",
    "software tester",
    "test engineer",
    "automation engineer",
  ],
  design: [
    "ui designer",
    "ux designer",
    "product designer",
    "ui/ux",
    "web designer",
  ],
};

function getNormalizedCategory(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(ROLE_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return null;
}

export interface RoleTaxonomyAliasRow {
  alias_id: number;
  alias_name: string;
  normalized_alias: string;
  match_weight: number;
  role_id: {
    role_id: number;
    role_name: string;
    category_id?: {
      category_id: number;
      category_code: string;
      category_name: string;
    };
  };
}

export interface ResolvedTaxonomyContext {
  keyword: string;
  resolved_role: string | null;
  category_code: string | null;
  category_name: string | null;
  matched_alias: string | null;
  match_weight: number;
  expanded_aliases: string[];
}

function resolveRoleTaxonomy(
  keyword: string,
  dbAliases: RoleTaxonomyAliasRow[]
): ResolvedTaxonomyContext {
  const normalizedQuery = keyword.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      keyword: "",
      resolved_role: null,
      category_code: null,
      category_name: null,
      matched_alias: null,
      match_weight: 1.0,
      expanded_aliases: [],
    };
  }

  // 1. Direct normalized alias match in DB
  const exactAlias = dbAliases.find((a) => a.normalized_alias === normalizedQuery);
  const matched =
    exactAlias ??
    dbAliases.find(
      (a) =>
        normalizedQuery.includes(a.normalized_alias) ||
        a.normalized_alias.includes(normalizedQuery)
    );

  if (matched && matched.role_id) {
    const roleName = matched.role_id.role_name;
    const catCode = matched.role_id.category_id?.category_code ?? null;
    const catName = matched.role_id.category_id?.category_name ?? null;

    // Expand all aliases in the same role or category
    const expanded = dbAliases
      .filter(
        (a) =>
          a.role_id?.role_id === matched.role_id.role_id ||
          (catCode && a.role_id?.category_id?.category_code === catCode)
      )
      .map((a) => a.normalized_alias);

    return {
      keyword,
      resolved_role: roleName,
      category_code: catCode,
      category_name: catName,
      matched_alias: matched.alias_name,
      match_weight: Number(matched.match_weight ?? 1.0),
      expanded_aliases: Array.from(new Set([normalizedQuery, ...expanded])),
    };
  }

  // Fallback to internal dictionary
  const catCode = getNormalizedCategory(normalizedQuery);
  const categoryKeywords = catCode ? (ROLE_MAP[catCode] ?? []) : [];

  return {
    keyword,
    resolved_role: catCode ? `${catCode.toUpperCase()} Specialist` : null,
    category_code: catCode,
    category_name: catCode ? `${catCode.toUpperCase()} Professional` : null,
    matched_alias: keyword,
    match_weight: 1.0,
    expanded_aliases: Array.from(new Set([normalizedQuery, ...categoryKeywords])),
  };
}

interface WorkRow {
  company_name: string;
  job_title: string;
  job_description?: string | null;
  start_date?: string;
  end_date?: string;
  is_current_role?: boolean;
}

interface RelevantExperienceResult {
  relevantYears: number;
  totalYears: number;
  matchedRoles: string[];
  ignoredRoles: string[];
}

function calcRelevantExperience(
  workRows: WorkRow[],
  targetRoleOrKeyword: string,
  targetSkills: string[],
  taxonomyContext?: ResolvedTaxonomyContext
): RelevantExperienceResult {
  let totalMonths = 0;
  let relevantMonths = 0;
  const matchedRoles: string[] = [];
  const ignoredRoles: string[] = [];

  const targetLower = targetRoleOrKeyword.toLowerCase();
  const targetCategory = taxonomyContext?.category_code ?? getNormalizedCategory(targetLower);
  const lowerTargetSkills = targetSkills.map((s) => s.toLowerCase());
  const expandedAliases = taxonomyContext?.expanded_aliases.map((a) => a.toLowerCase()) ?? [];

  for (const exp of workRows) {
    if (!exp.start_date) continue;
    const start = new Date(exp.start_date);
    const end = exp.is_current_role ? new Date() : exp.end_date ? new Date(exp.end_date) : new Date();
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    totalMonths += months;

    const titleLower = (exp.job_title || "").toLowerCase();
    const descLower = (exp.job_description || "").toLowerCase();
    const workCategory = getNormalizedCategory(titleLower);

    // Relevance check 1: Target category matches work category
    const isCategoryMatch =
      targetCategory &&
      workCategory &&
      (targetCategory === workCategory || targetCategory === "fullstack" || workCategory === "fullstack");

    // Relevance check 2: Title matches taxonomy expanded aliases or target keyword
    const isAliasMatch = expandedAliases.some(
      (alias) => titleLower.includes(alias) || descLower.includes(alias)
    );
    const isKeywordMatch = Boolean(
      targetLower && (titleLower.includes(targetLower) || descLower.includes(targetLower))
    );

    // Relevance check 3: Title or Job Description contains any of the target skills
    const isSkillMatch = lowerTargetSkills.some((s) => titleLower.includes(s) || descLower.includes(s));

    if (
      isCategoryMatch ||
      isAliasMatch ||
      isKeywordMatch ||
      isSkillMatch ||
      (!targetRoleOrKeyword && targetSkills.length === 0)
    ) {
      relevantMonths += months;
      matchedRoles.push(exp.job_title);
    } else {
      ignoredRoles.push(exp.job_title);
    }
  }

  return {
    relevantYears: Number((relevantMonths / 12).toFixed(1)),
    totalYears: Number((totalMonths / 12).toFixed(1)),
    matchedRoles: Array.from(new Set(matchedRoles)),
    ignoredRoles: Array.from(new Set(ignoredRoles)),
  };
}

function calcRelevantEducation(
  eduRows: Array<{ school_course_id?: { course_name?: string }; course_name_raw?: string }>,
  targetSkills: string[],
  targetRole: string
): number {
  if (eduRows.length === 0) return 3;

  const highTechKeywords = [
    "computer science",
    "information technology",
    "software",
    "computer engineering",
    "web development",
    "data science",
    "marketing",
    "communication",
    "business",
  ];
  const medTechKeywords = [
    "mathematics",
    "physics",
    "engineering",
    "information systems",
    "cyber",
    "technology",
    "arts",
    "design",
  ];

  for (const edu of eduRows) {
    const course = (edu.school_course_id?.course_name || edu.course_name_raw || "").toLowerCase();
    if (!course) continue;

    if (highTechKeywords.some((kw) => course.includes(kw))) return 10;
    if (medTechKeywords.some((kw) => course.includes(kw))) return 7;
  }
  return 4;
}

function calcRelevantCertifications(
  certRows: Array<{ certificate_name: string; issuing_organization?: string }>,
  targetSkills: string[]
): number {
  if (certRows.length === 0) return 0;
  const lowerSkills = targetSkills.map((s) => s.toLowerCase());

  let score = 0;
  for (const cert of certRows) {
    const certName = (cert.certificate_name || "").toLowerCase();
    const isRelevant =
      lowerSkills.some((s) => certName.includes(s)) ||
      [
        "aws",
        "azure",
        "gcp",
        "google",
        "cisco",
        "scrum",
        "pmp",
        "comptia",
        "oracle",
        "microsoft",
        "react",
        "node",
        "java",
        "python",
        "kubernetes",
        "certified",
        "meta",
        "hubspot",
      ].some((kw) => certName.includes(kw));

    if (isRelevant) score += 5;
    else score += 2;
  }
  return Math.min(score, 10);
}

function calcPortfolioScore(
  socialLinks: Array<{ platform_name: string; profile_url: string }>,
  profileSummary?: string,
  workMediaCount = 0
): number {
  let score = 0;
  const github = socialLinks.some(
    (s) =>
      s.platform_name?.toLowerCase().includes("github") ||
      s.profile_url?.toLowerCase().includes("github.com")
  );
  const portfolio = socialLinks.some(
    (s) =>
      s.platform_name?.toLowerCase().includes("portfolio") ||
      s.platform_name?.toLowerCase().includes("website") ||
      s.profile_url?.startsWith("http")
  );

  if (github) score += 2;
  if (portfolio) score += 2;
  if (workMediaCount > 0 || (profileSummary && profileSummary.length > 50)) score += 1;

  return Math.min(score, 5);
}

function calcAvailabilityScore(availability: string): number {
  switch (availability?.toUpperCase()) {
    case "IMMEDIATELY_AVAILABLE":
    case "AVAILABLE":
      return 5;
    case "OPEN":
      return 3;
    case "EMPLOYED":
      return 1;
    default:
      return 0;
  }
}

export interface MatchBreakdown {
  overallScore: number;
  skills: number;
  experience: {
    score: number;
    relevantYears: number;
    totalYears: number;
    matchedRoles: string[];
    ignoredRoles: string[];
  };
  education: number;
  certifications: number;
  availability: number;
  location: number;
  portfolio: number;
}

interface CompatibilityScoreResult {
  overallScore: number;
  breakdown: MatchBreakdown;
}

function computeCompatibilityScore(params: {
  skillsRequested: string[];
  candidateSkills: string[];
  workRows: WorkRow[];
  eduRows: Array<{ school_course_id?: { course_name?: string }; course_name_raw?: string }>;
  certRows: Array<{ certificate_name: string; issuing_organization?: string }>;
  socialLinks: Array<{ platform_name: string; profile_url: string }>;
  requiredExperienceYears: number;
  targetRoleOrKeyword: string;
  requiredLocation: string;
  candidateLocation: string;
  availability: string;
  profileSummary?: string;
  workMediaCount?: number;
  taxonomyContext?: ResolvedTaxonomyContext;
}): CompatibilityScoreResult {
  const {
    skillsRequested,
    candidateSkills,
    workRows,
    eduRows,
    certRows,
    socialLinks,
    requiredExperienceYears,
    targetRoleOrKeyword,
    requiredLocation,
    candidateLocation,
    availability,
    profileSummary,
    workMediaCount = 0,
    taxonomyContext,
  } = params;

  // 1. Skills Match (45%)
  let skillsScore = 0;
  if (skillsRequested.length > 0) {
    const lowerCandidateSkills = candidateSkills.map((s) => s.toLowerCase());
    const matched = skillsRequested.filter((s) => lowerCandidateSkills.includes(s.toLowerCase())).length;
    skillsScore = Math.round(Math.min(matched / skillsRequested.length, 1) * 45);
  } else {
    skillsScore = candidateSkills.length > 0 ? 35 : 20;
  }

  // 2. Relevant Experience Match (20%)
  const expRes = calcRelevantExperience(workRows, targetRoleOrKeyword, skillsRequested, taxonomyContext);
  let expScore = 0;
  if (requiredExperienceYears > 0) {
    const ratio = Math.min(expRes.relevantYears / requiredExperienceYears, 1.2);
    expScore = Math.round(Math.min(ratio, 1) * 20);
  } else {
    expScore = expRes.relevantYears > 0 ? Math.min(Math.round(expRes.relevantYears * 4), 20) : 5;
  }

  // 3. Education Match (10%)
  const educationScore = calcRelevantEducation(eduRows, skillsRequested, targetRoleOrKeyword);

  // 4. Certifications Match (10%)
  const certsScore = calcRelevantCertifications(certRows, skillsRequested);

  // 5. Availability (5%)
  const availScore = calcAvailabilityScore(availability);

  // 6. Location (5%)
  let locationScore = 0;
  if (!requiredLocation || requiredLocation.toLowerCase() === "remote") {
    locationScore = 5;
  } else if (candidateLocation && candidateLocation.toLowerCase().includes(requiredLocation.toLowerCase())) {
    locationScore = 5;
  } else {
    locationScore = 2;
  }

  // 7. Portfolio (5%)
  const portfolioScore = calcPortfolioScore(socialLinks, profileSummary, workMediaCount);

  // Apply alias match weight modifier if taxonomy resolved
  const aliasWeightModifier = taxonomyContext?.match_weight ?? 1.0;

  const total = Math.min(
    100,
    Math.round(
      (skillsScore +
        expScore +
        educationScore +
        certsScore +
        availScore +
        locationScore +
        portfolioScore) *
        aliasWeightModifier
    )
  );

  return {
    overallScore: total,
    breakdown: {
      overallScore: total,
      skills: skillsScore,
      experience: {
        score: expScore,
        relevantYears: expRes.relevantYears,
        totalYears: expRes.totalYears,
        matchedRoles: expRes.matchedRoles,
        ignoredRoles: expRes.ignoredRoles,
      },
      education: educationScore,
      certifications: certsScore,
      availability: availScore,
      location: locationScore,
      portfolio: portfolioScore,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json(
        {
          error: `Restricted: Your company verification status is ${verification_status}. Talent Search is only available to verified companies.`,
          verification_status,
          talents: [],
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const keyword = (searchParams.get("keyword") || "").trim();
    const skillsParam = searchParams.get("skills") || "";
    const location = (searchParams.get("location") || "").trim();
    const experienceLevel = searchParams.get("experience_level") || "";
    const availability = searchParams.get("availability") || "";
    const schoolId = searchParams.get("school_id") || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")));
    const jobIdForMatch = searchParams.get("job_id") || "";

    const requestedSkills = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // ────────────────────────────────────────────
    // 1. Fetch profiles + DB Taxonomy aliases in parallel
    // ────────────────────────────────────────────
    const profilesUrl =
      `${DIRECTUS_BASE}/items/vs_job_seeker_profile?` +
      `filter[profile_visibility][_eq]=Public` +
      `&fields=profile_id,user_id,profile_headline,professional_summary,profile_visibility` +
      `&limit=-1`;

    const aliasesUrl =
      `${DIRECTUS_BASE}/items/vs_role_title_alias?` +
      `fields=alias_id,alias_name,normalized_alias,match_weight,role_id.role_id,role_id.role_name,role_id.category_id.category_id,role_id.category_id.category_code,role_id.category_id.category_name` +
      `&limit=-1`;

    const [profilesRes, aliasesRes] = await Promise.all([
      fetch(profilesUrl, { headers: getHeaders(), cache: "no-store" }),
      fetch(aliasesUrl, { headers: getHeaders(), cache: "no-store" }).catch(() => null),
    ]);

    if (!profilesRes.ok) {
      return NextResponse.json({ error: "Failed to load talent profiles." }, { status: 502 });
    }

    const profilesJson = await profilesRes.json();
    const profiles: Array<{
      profile_id: number;
      user_id: number;
      profile_headline?: string;
      professional_summary?: string;
    }> = profilesJson.data ?? [];

    const dbAliases: RoleTaxonomyAliasRow[] =
      aliasesRes && aliasesRes.ok ? (await aliasesRes.json()).data ?? [] : [];

    // Resolve Role Taxonomy for current keyword
    const taxonomyContext = resolveRoleTaxonomy(keyword, dbAliases);

    if (profiles.length === 0) {
      return NextResponse.json({
        search_mode: "browse",
        search_context: taxonomyContext,
        talents: [],
        total: 0,
        page,
        limit,
      });
    }

    const profileUserIds = profiles.map((p) => p.user_id);

    // ────────────────────────────────────────────
    // 2. Bulk fetch associated data in parallel
    // ────────────────────────────────────────────
    const [usersRes, skillsRes, workRes, eduRes, savedRes, jobRes, certsRes, socialRes] = await Promise.all([
      // vs_user — basic info + location
      fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_contact,user_city,user_province,profile_image_url,gender&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_user_skills_map — skills
      fetch(
        `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,skill_id.skill_name&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_work_experience
      fetch(
        `${DIRECTUS_BASE}/items/vs_work_experience?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,company_name,job_title,job_description,start_date,end_date,is_current_role,employment_type,location&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_employee_education with school join
      fetch(
        `${DIRECTUS_BASE}/items/vs_employee_education?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,school_id.school_name,school_id.school_id,school_course_id.course_name,start_date,end_date&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_saved_applicant — which of these are already saved by this company
      companyId
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_saved_applicant?filter[company_id][_eq]=${companyId}&fields=applicant_user_id&limit=-1`,
            { headers: getHeaders(), cache: "no-store" }
          )
        : Promise.resolve(null),
      // vs_job_posting — if job_id provided for AI match
      jobIdForMatch
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_eq]=${jobIdForMatch}&fields=job_id,job_title,job_location,experience_level&limit=1`,
            { headers: getHeaders(), cache: "no-store" }
          )
        : Promise.resolve(null),
      // vs_certifications
      fetch(
        `${DIRECTUS_BASE}/items/vs_certifications?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,certificate_name,issuing_organization&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      // vs_user_social_links
      fetch(
        `${DIRECTUS_BASE}/items/vs_user_social_links?filter[user_id][_in]=${profileUserIds.join(",")}&fields=user_id,platform_name,profile_url&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
    ]);

    const users: Array<{
      user_id: number;
      user_fname: string;
      user_lname: string;
      user_email: string;
      user_city?: string;
      user_province?: string;
      profile_image_url?: string;
    }> = usersRes.ok ? (await usersRes.json()).data ?? [] : [];

    const skillRows: Array<{ user_id: number; skill_id?: { skill_name?: string } }> =
      skillsRes.ok ? (await skillsRes.json()).data ?? [] : [];

    const workRows: Array<{
      user_id: number;
      company_name: string;
      job_title: string;
      job_description?: string;
      start_date?: string;
      end_date?: string;
      is_current_role?: boolean;
      employment_type?: string;
      location?: string;
    }> = workRes.ok ? (await workRes.json()).data ?? [] : [];

    const eduRows: Array<{
      user_id: number;
      school_id?: { school_name?: string; school_id?: number };
      school_course_id?: { course_name?: string };
      start_date?: string;
      end_date?: string;
    }> = eduRes.ok ? (await eduRes.json()).data ?? [] : [];

    const certRows: Array<{ user_id: number; certificate_name: string; issuing_organization?: string }> =
      certsRes.ok ? (await certsRes.json()).data ?? [] : [];

    const socialRows: Array<{ user_id: number; platform_name: string; profile_url: string }> =
      socialRes.ok ? (await socialRes.json()).data ?? [] : [];

    const savedUserIds = new Set<number>();
    if (savedRes && savedRes.ok) {
      const savedJson = await savedRes.json();
      (savedJson.data ?? []).forEach((s: { applicant_user_id: number }) => savedUserIds.add(s.applicant_user_id));
    }

    // Job for match
    let jobData: { job_title?: string; job_location?: string; experience_level?: string } | null = null;
    if (jobRes && jobRes.ok) {
      const jobJson = await jobRes.json();
      jobData = jobJson.data?.[0] ?? null;
    }

    // Job skills for match
    let jobSkills: string[] = [];
    if (jobIdForMatch) {
      const jsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_skills_map?filter[job_id][_eq]=${jobIdForMatch}&fields=skill_id.skill_name&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (jsRes.ok) {
        const jsJson = await jsRes.json();
        jobSkills = (jsJson.data ?? [])
          .map((r: { skill_id?: { skill_name?: string } }) => r.skill_id?.skill_name ?? "")
          .filter(Boolean);
      }
    }

    // ────────────────────────────────────────────
    // 3. Build lookup maps
    // ────────────────────────────────────────────
    const usersMap = new Map(users.map((u) => [u.user_id, u]));

    const skillsMap = new Map<number, string[]>();
    for (const row of skillRows) {
      const name = row.skill_id?.skill_name;
      if (!name) continue;
      if (!skillsMap.has(row.user_id)) skillsMap.set(row.user_id, []);
      skillsMap.get(row.user_id)!.push(name);
    }

    const workMap = new Map<number, typeof workRows>();
    for (const row of workRows) {
      if (!workMap.has(row.user_id)) workMap.set(row.user_id, []);
      workMap.get(row.user_id)!.push(row);
    }

    const eduMap = new Map<number, typeof eduRows>();
    for (const row of eduRows) {
      if (!eduMap.has(row.user_id)) eduMap.set(row.user_id, []);
      eduMap.get(row.user_id)!.push(row);
    }

    const certsMap = new Map<number, typeof certRows>();
    for (const row of certRows) {
      if (!certsMap.has(row.user_id)) certsMap.set(row.user_id, []);
      certsMap.get(row.user_id)!.push(row);
    }

    const socialMap = new Map<number, typeof socialRows>();
    for (const row of socialRows) {
      if (!socialMap.has(row.user_id)) socialMap.set(row.user_id, []);
      socialMap.get(row.user_id)!.push(row);
    }

    // ────────────────────────────────────────────
    // 4. Build talent records + compute compatibility
    // ────────────────────────────────────────────
    const expLevelRange: Record<string, [number, number]> = {
      ENTRY: [0, 2],
      JUNIOR: [0, 3],
      MID: [2, 6],
      SENIOR: [5, 99],
      MANAGER: [7, 99],
      EXECUTIVE: [10, 99],
    };

    const requiredExpYears = jobData?.experience_level
      ? (expLevelRange[jobData.experience_level.toUpperCase()]?.[0] ?? 0)
      : 0;

    const hasSearchCriteria = Boolean(
      keyword ||
        requestedSkills.length > 0 ||
        jobIdForMatch ||
        location ||
        experienceLevel ||
        schoolId
    );

    const searchMode: "browse" | "search" = hasSearchCriteria ? "search" : "browse";

    interface TalentResult {
      user_id: number;
      profile_id: number;
      name: string;
      email: string;
      profile_image_url: string | null;
      headline: string | null;
      summary: string | null;
      location: string;
      skills: string[];
      experience_years: number;
      relevant_experience_years: number;
      work_experience: Array<{
        company_name: string;
        job_title: string;
        start_date: string | null;
        end_date: string | null;
        is_current_role: boolean;
        employment_type: string | null;
      }>;
      education: Array<{
        school_name: string | null;
        school_id: number | null;
        course_name: string | null;
        start_date: string | null;
        end_date: string | null;
      }>;
      availability_status: string;
      is_saved: boolean;
      match_score: number | null;
      match_breakdown: MatchBreakdown | null;
    }

    const allTalents: TalentResult[] = profiles
      .map((profile) => {
        const user = usersMap.get(profile.user_id);
        if (!user) return null;

        const skills = skillsMap.get(profile.user_id) ?? [];
        const work = workMap.get(profile.user_id) ?? [];
        const edu = eduMap.get(profile.user_id) ?? [];
        const certs = certsMap.get(profile.user_id) ?? [];
        const social = socialMap.get(profile.user_id) ?? [];

        const location = [user.user_city, user.user_province].filter(Boolean).join(", ");
        const currentRole = work.find((w) => w.is_current_role);
        const availabilityStatus = currentRole ? "EMPLOYED" : "AVAILABLE";

        const targetSkills = jobIdForMatch ? jobSkills : requestedSkills;
        const targetRole = jobData?.job_title ?? keyword ?? "";

        // Compute Candidate Compatibility Score & Breakdown with Taxonomy Context
        const compat = computeCompatibilityScore({
          skillsRequested: targetSkills,
          candidateSkills: skills,
          workRows: work,
          eduRows: edu,
          certRows: certs,
          socialLinks: social,
          requiredExperienceYears: requiredExpYears,
          targetRoleOrKeyword: targetRole,
          requiredLocation: jobData?.job_location ?? location,
          candidateLocation: location,
          availability: availabilityStatus,
          profileSummary: profile.professional_summary,
          workMediaCount: 0,
          taxonomyContext,
        });

        return {
          user_id: profile.user_id,
          profile_id: profile.profile_id,
          name: `${user.user_fname} ${user.user_lname}`.trim(),
          email: user.user_email,
          profile_image_url: user.profile_image_url ?? null,
          headline: profile.profile_headline ?? currentRole?.job_title ?? null,
          summary: profile.professional_summary ?? null,
          location,
          skills,
          experience_years: compat.breakdown.experience.totalYears,
          relevant_experience_years: compat.breakdown.experience.relevantYears,
          work_experience: work.slice(0, 3).map((w) => ({
            company_name: w.company_name,
            job_title: w.job_title,
            start_date: w.start_date ?? null,
            end_date: w.end_date ?? null,
            is_current_role: w.is_current_role ?? false,
            employment_type: w.employment_type ?? null,
          })),
          education: edu.slice(0, 2).map((e) => ({
            school_name: e.school_id?.school_name ?? null,
            school_id: e.school_id?.school_id ?? null,
            course_name: e.school_course_id?.course_name ?? null,
            start_date: e.start_date ?? null,
            end_date: e.end_date ?? null,
          })),
          availability_status: availabilityStatus,
          is_saved: savedUserIds.has(profile.user_id),
          match_score: searchMode === "search" ? compat.overallScore : null,
          match_breakdown: searchMode === "search" ? compat.breakdown : null,
        } satisfies TalentResult;
      })
      .filter((t): t is TalentResult => t !== null);

    // ────────────────────────────────────────────
    // 5. Post-fetch tokenized + taxonomy filtering & sorting
    // ────────────────────────────────────────────
    let filtered = allTalents;

    if (keyword) {
      const queryTokens = keyword.toLowerCase().split(/\s+/).filter(Boolean);
      const expandedAliases = taxonomyContext.expanded_aliases.map((a) => a.toLowerCase());

      filtered = filtered.filter((t) => {
        const haystack = [
          t.name,
          t.headline,
          t.summary,
          ...t.skills,
          ...t.work_experience.map((w) => `${w.job_title} ${w.company_name}`),
          ...t.education.map((e) => `${e.school_name} ${e.course_name}`),
        ]
          .join(" ")
          .toLowerCase();

        // 1. Direct contiguous match
        if (haystack.includes(keyword.toLowerCase())) return true;

        // 2. Tokenized match (all search words present in profile)
        const allTokensMatch = queryTokens.every((token) => haystack.includes(token));
        if (allTokensMatch) return true;

        // 3. Taxonomy expanded alias match (e.g. "social media creator" matches "social media strategist")
        const aliasMatch = expandedAliases.some((alias) => alias.length > 3 && haystack.includes(alias));
        if (aliasMatch) return true;

        return false;
      });
    }

    if (requestedSkills.length > 0 && !jobIdForMatch) {
      filtered = filtered.filter((t) => {
        const lowerSkills = t.skills.map((s: string) => s.toLowerCase());
        return requestedSkills.some((rs) => lowerSkills.includes(rs.toLowerCase()));
      });
    }

    if (location) {
      filtered = filtered.filter((t) =>
        t.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (experienceLevel) {
      const [minYears, maxYears] = expLevelRange[experienceLevel.toUpperCase()] ?? [0, 99];
      filtered = filtered.filter(
        (t) => t.relevant_experience_years >= minYears && t.relevant_experience_years <= maxYears
      );
    }

    if (availability) {
      filtered = filtered.filter((t) => t.availability_status === availability.toUpperCase());
    }

    if (schoolId) {
      filtered = filtered.filter((t) =>
        t.education.some((e) => String(e.school_id) === String(schoolId))
      );
    }

    // Sort mode logic
    if (searchMode === "search") {
      filtered.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    } else {
      // Browse mode sorting: profile completeness + experience + profile_id desc
      filtered.sort((a, b) => {
        const aCompleteness = (a.skills.length > 0 ? 10 : 0) + a.experience_years;
        const bCompleteness = (b.skills.length > 0 ? 10 : 0) + b.experience_years;
        return bCompleteness - aCompleteness || b.profile_id - a.profile_id;
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      search_mode: searchMode,
      search_context: searchMode === "search" ? taxonomyContext : null,
      talents: paginated,
      total,
      page,
      limit,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[talent-search GET] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
