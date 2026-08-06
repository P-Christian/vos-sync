// src/app/api/client/talent-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import {
  runMatchingEngine,
  normalizeRawCandidate,
  MatchMode,
  MatchContext,
  MatchResult,
  cleanText,
  analyzeQuery,
  retrieveCandidatePool,
} from "@/modules/matching-engine";
import { expandQueryWithGemini, shouldExpandWithGemini } from "@/lib/gemini/queryUnderstanding";
import { rerankCandidatesWithGemini } from "@/lib/gemini/aiReranker";

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

// ── DB-Backed Taxonomy Types ──────────────────────────────────────────────────

export interface RoleSkillMappingRow {
  role_id: { role_id: number };
  skill_id: { id: number; skill_name: string };
  importance_weight: number;
  is_required: number;
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
  resolved_role_id: number | null;
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
  const original = (keyword || "").trim();
  const cleanedKey = cleanText(original);
  if (!cleanedKey) {
    return {
      keyword: "",
      resolved_role: null,
      resolved_role_id: null,
      category_code: null,
      category_name: null,
      matched_alias: null,
      match_weight: 1.0,
      expanded_aliases: [],
    };
  }

  // 1. Exact normalized alias match (using cleanText to strip hyphens, underscores, dots, etc.)
  const exactAlias = dbAliases.find((a) => cleanText(a.normalized_alias) === cleanedKey);
  // 2. Partial containment match — also compare space-stripped versions (e.g. "webdeveloper" vs "web developer")
  const cleanedKeyNoSpaces = cleanedKey.replace(/\s+/g, "");
  const partialAlias =
    exactAlias ??
    dbAliases.find((a) => {
      const norm = cleanText(a.normalized_alias);
      const normNoSpaces = norm.replace(/\s+/g, "");
      return (
        norm &&
        (cleanedKey.includes(norm) ||
          norm.includes(cleanedKey) ||
          cleanedKeyNoSpaces === normNoSpaces ||
          cleanedKeyNoSpaces.includes(normNoSpaces) ||
          normNoSpaces.includes(cleanedKeyNoSpaces))
      );
    });

  if (partialAlias && partialAlias.role_id) {
    const matched = partialAlias;
    const roleName = matched.role_id.role_name;
    const roleId = matched.role_id.role_id;
    const catCode = matched.role_id.category_id?.category_code ?? null;
    const catName = matched.role_id.category_id?.category_name ?? null;

    // Expand all aliases in the same role OR same category for broader matching
    const expanded = dbAliases
      .filter(
        (a) =>
          a.role_id?.role_id === roleId ||
          (catCode && a.role_id?.category_id?.category_code === catCode)
      )
      .map((a) => cleanText(a.normalized_alias));

    return {
      keyword,
      resolved_role: roleName,
      resolved_role_id: roleId,
      category_code: catCode,
      category_name: catName,
      matched_alias: matched.alias_name,
      match_weight: Number(matched.match_weight ?? 1.0),
      expanded_aliases: Array.from(new Set([cleanedKey, ...expanded])).filter(Boolean),
    };
  }

  // No DB match — no category inflation, just use the raw keyword
  return {
    keyword,
    resolved_role: null,
    resolved_role_id: null,
    category_code: null,
    category_name: null,
    matched_alias: keyword,
    match_weight: 1.0,
    expanded_aliases: [cleanedKey],
  };
}

export interface TalentResult {
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
  ranking_score: number | null;
  match_result: MatchResult | null;
  match_breakdown: {
    mode: MatchMode;
    overallScore: number;
    rankingScore: number;
    confidence: any;
    sections: any[];
    explanation: any;
    evidence: any[];
  } | null;
  ai_explanation: string | null;
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

    const roleSkillsUrl =
      `${DIRECTUS_BASE}/items/vs_role_skill_mapping?` +
      `fields=role_id.role_id,skill_id.id,skill_id.skill_name,importance_weight,is_required` +
      `&limit=-1`;

    const [profilesRes, aliasesRes, roleSkillsRes] = await Promise.all([
      fetch(profilesUrl, { headers: getHeaders(), cache: "no-store" }),
      fetch(aliasesUrl, { headers: getHeaders(), cache: "no-store" }).catch(() => null),
      fetch(roleSkillsUrl, { headers: getHeaders(), cache: "no-store" }).catch(() => null),
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

    const dbRoleSkills: RoleSkillMappingRow[] =
      roleSkillsRes && roleSkillsRes.ok ? (await roleSkillsRes.json()).data ?? [] : [];

    // ────────────────────────────────────────────
    // Gemini Layer A: Query Understanding (runs BEFORE taxonomy + retrieval)
    // Converts natural language to canonical role keyword for matching
    // e.g. "I need someone who builds websites with React" → "React Developer"
    // ────────────────────────────────────────────
    let geminiQueryIntent = null;
    let matchKeyword = keyword; // effective keyword used for matching (may be Gemini-resolved)

    if (keyword && shouldExpandWithGemini(keyword)) {
      console.log(`[talent-search] 🤖 Gemini Layer A: expanding query "${keyword}"`);
      geminiQueryIntent = await expandQueryWithGemini(keyword).catch(() => null);

      if (geminiQueryIntent) {
        console.log(`[talent-search] 🤖 Gemini Layer A result:`, JSON.stringify(geminiQueryIntent));
      } else {
        console.log(`[talent-search] ⚠️  Gemini Layer A: failed or no API key — using raw keyword`);
      }

      // Use Gemini resolved role as effective search keyword when confidence is high enough
      if (
        geminiQueryIntent &&
        geminiQueryIntent.resolved_role &&
        (geminiQueryIntent.confidence === "HIGH" || geminiQueryIntent.confidence === "MEDIUM")
      ) {
        matchKeyword = geminiQueryIntent.resolved_role;
        console.log(`[talent-search] 🤖 Gemini Layer A: matchKeyword resolved → "${matchKeyword}"`);
      } else {
        console.log(`[talent-search] ℹ️  Gemini Layer A: keeping original keyword → "${matchKeyword}"`);
      }
    } else {
      console.log(`[talent-search] ℹ️  Gemini Layer A: skipped (query too short) — keyword="${keyword}"`);
    }

    // Resolve Role Taxonomy using the effective match keyword (Gemini-resolved or original)
    const taxonomyContext = resolveRoleTaxonomy(matchKeyword, dbAliases);
    console.log(`[talent-search] 📚 Taxonomy resolved:`, JSON.stringify({
      matchKeyword,
      resolved_role: taxonomyContext.resolved_role,
      resolved_role_id: taxonomyContext.resolved_role_id,
      category_code: taxonomyContext.category_code,
      aliases_count: taxonomyContext.expanded_aliases.length,
    }));

    // Build role → skill name list map from DB
    const roleSkillsMap = new Map<number, string[]>();
    for (const row of dbRoleSkills) {
      const roleId = row.role_id?.role_id;
      const skillName = row.skill_id?.skill_name;
      if (!roleId || !skillName) continue;
      if (!roleSkillsMap.has(roleId)) roleSkillsMap.set(roleId, []);
      roleSkillsMap.get(roleId)!.push(skillName);
    }

    // Auto-expand requestedSkills with DB role skills when user specified no explicit skills
    // and the keyword resolved to a known DB role
    let effectiveRequestedSkills = requestedSkills;
    if (requestedSkills.length === 0 && taxonomyContext.resolved_role_id !== null) {
      const roleId = taxonomyContext.resolved_role_id;
      const roleSkills = roleSkillsMap.get(roleId) ?? [];
      if (roleSkills.length > 0) {
        effectiveRequestedSkills = roleSkills;
      }
    }

    // Merge Gemini inferred skills if query understanding enriched the query
    if (geminiQueryIntent && geminiQueryIntent.inferred_skills.length > 0 && requestedSkills.length === 0) {
      effectiveRequestedSkills = Array.from(
        new Set([...effectiveRequestedSkills, ...geminiQueryIntent.inferred_skills])
      );
    }
    console.log(`[talent-search] 🎯 Effective skills for scoring (${effectiveRequestedSkills.length}):`, effectiveRequestedSkills.slice(0, 10));

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
        schoolId ||
        availability
    );

    const searchMode: "browse" | "search" = hasSearchCriteria ? "search" : "browse";

    let activeEngineMode: MatchMode = MatchMode.BROWSE;
    if (jobIdForMatch && keyword) {
      activeEngineMode = MatchMode.HYBRID;
    } else if (jobIdForMatch) {
      activeEngineMode = MatchMode.JOB_MATCH;
    } else if (requestedSkills.length > 0) {
      activeEngineMode = MatchMode.SKILL_MATCH;
    } else if (keyword) {
      activeEngineMode = MatchMode.ROLE_SIMILARITY;
    } else if (hasSearchCriteria) {
      activeEngineMode = MatchMode.HYBRID;
    }

    const matchContext: MatchContext = {
      mode: activeEngineMode,
      keyword: matchKeyword, // Use Gemini-resolved role keyword for scoring
      requestedSkills: jobIdForMatch ? jobSkills : effectiveRequestedSkills,
      jobId: jobIdForMatch ? Number(jobIdForMatch) : undefined,
      location,
      requiredExperience: requiredExpYears,
      taxonomyContext,
    };

    // Layer 1: High-Recall Candidate Retrieval Filter (Jaro-Winkler, Levenshtein, Token Overlap, Taxonomy Expansion)
    const normalizedProfilesMap = new Map();
    const normalizedProfilesList = [];

    for (const profile of profiles) {
      const user = usersMap.get(profile.user_id);
      if (!user) continue;

      const skills = skillsMap.get(profile.user_id) ?? [];
      const work = workMap.get(profile.user_id) ?? [];
      const edu = eduMap.get(profile.user_id) ?? [];
      const certs = certsMap.get(profile.user_id) ?? [];
      const social = socialMap.get(profile.user_id) ?? [];
      const location = [user.user_city, user.user_province].filter(Boolean).join(", ");

      const normalized = normalizeRawCandidate({
        user_id: profile.user_id,
        name: `${user.user_fname} ${user.user_lname}`.trim(),
        email: user.user_email,
        headline: profile.profile_headline,
        summary: profile.professional_summary,
        location,
        skills,
        work_experience: work,
        education: edu.map((e) => ({
          school_name: e.school_id?.school_name,
          course_name: e.school_course_id?.course_name,
          start_date: e.start_date,
          end_date: e.end_date,
        })),
        certifications: certs,
        social_links: social,
      });

      normalizedProfilesMap.set(profile.user_id, { profile, user, skills, work, edu, certs, social, normalized });
      normalizedProfilesList.push(normalized);
    }

    const analyzedQuery = analyzeQuery(matchKeyword);
    console.log(`[talent-search] 🔍 Layer 1: scanning ${normalizedProfilesList.length} total profiles...`);
    const retrievedPool = retrieveCandidatePool(normalizedProfilesList, analyzedQuery, taxonomyContext, 15);
    console.log(`[talent-search] ✅ Layer 1 pool: ${retrievedPool.length} candidates passed retrieval threshold`);

    // Layer 2: Run Matching Engine & Final Scoring on Retrieved Candidate Pool
    const allTalents: TalentResult[] = (retrievedPool
      .map(({ candidate }) => {
        const item = normalizedProfilesMap.get(candidate.id);
        if (!item) return null;

        const { profile, user, skills, work, edu, certs, social, normalized } = item;

        // Run VOS Sync Matching Engine Pipeline
        const engineResult = runMatchingEngine(normalized, matchContext);

        // Find relevant exp years from experience evaluator trace/evidence
        const expEvidence = engineResult.evidence.find((e) => e.type === "EXPERIENCE");
        const relYearsMatch = expEvidence?.value.match(/([\d\.]+)\s*yrs/);
        const relYears = relYearsMatch ? Number(relYearsMatch[1]) : 0;

        // Match score percentage & badges are shown ONLY when matching against a specific Job Posting (jobIdForMatch)
        const showMatchScore = Boolean(jobIdForMatch);

        return {
          user_id: profile.user_id,
          profile_id: profile.profile_id,
          name: normalized.name,
          email: normalized.email,
          profile_image_url: user.profile_image_url ?? null,
          headline: normalized.headline,
          summary: normalized.summary,
          location: normalized.location,
          skills: normalized.skills,
          experience_years: work.reduce((acc: number, w: any) => {
            if (!w.start_date) return acc;
            const s = new Date(w.start_date);
            const e = w.is_current_role ? new Date() : w.end_date ? new Date(w.end_date) : new Date();
            return acc + Math.max(0, (e.getFullYear() - s.getFullYear()));
          }, 0),
          relevant_experience_years: relYears,
          work_experience: work.slice(0, 3).map((w: any) => ({
            company_name: w.company_name,
            job_title: w.job_title,
            start_date: w.start_date ?? null,
            end_date: w.end_date ?? null,
            is_current_role: w.is_current_role ?? false,
            employment_type: w.employment_type ?? null,
          })),
          education: edu.slice(0, 2).map((e: any) => ({
            school_name: e.school_id?.school_name ?? null,
            school_id: e.school_id?.school_id ?? null,
            course_name: e.school_course_id?.course_name ?? null,
            start_date: e.start_date ?? null,
            end_date: e.end_date ?? null,
          })),
          availability_status: normalized.availability,
          is_saved: savedUserIds.has(profile.user_id),
          match_score: showMatchScore ? engineResult.compatibility.score : null,
          ranking_score: searchMode === "search" ? engineResult.ranking.score : null,
          match_result: showMatchScore ? engineResult : null,
          match_breakdown: showMatchScore ? {
            mode: engineResult.mode,
            overallScore: engineResult.compatibility.score,
            rankingScore: engineResult.ranking.score,
            confidence: engineResult.confidence,
            sections: engineResult.compatibility.sections,
            explanation: engineResult.explanation,
            evidence: engineResult.evidence,
          } : null,
          ai_explanation: null as string | null,
        };
      })
      .filter((t): t is TalentResult => t !== null)) as TalentResult[];

    console.log(`[talent-search] ✅ Layer 2 scored: ${allTalents.length} candidates after engine scoring`);

    // ────────────────────────────────────────────
    // 5. Explicit sidebar filters (skills, location, experience, availability, school)
    // NOTE: Keyword-based post-filtering is intentionally removed.
    //       Layer 1 (retrieval) and Layer 2 (scoring) already determine relevance.
    //       A second keyword gate here would reject valid candidates whose title/summary
    //       differs from the query but whose skills and experience are highly relevant.
    // ────────────────────────────────────────────
    let filtered = allTalents;
    console.log(`[talent-search] ✅ Layer 2 candidates entering ranking: ${filtered.length}`);

    // Filter by user-specified skills only (not expanded DB role skills — those are for scoring only)
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
      filtered.sort((a, b) => (b.ranking_score ?? b.match_score ?? 0) - (a.ranking_score ?? a.match_score ?? 0));
    } else {
      // Browse mode sorting: profile completeness + experience + profile_id desc
      filtered.sort((a, b) => {
        const aCompleteness = (a.skills.length > 0 ? 10 : 0) + a.experience_years;
        const bCompleteness = (b.skills.length > 0 ? 10 : 0) + b.experience_years;
        return bCompleteness - aCompleteness || b.profile_id - a.profile_id;
      });
    }

    const total = filtered.length;

    // ────────────────────────────────────────────
    // 6. Gemini Layer B: AI Reranking (job match mode only, top 50)
    // Note: Layer B semantic reranking requires both an active job posting (jobIdForMatch)
    // and a search query prompt (keyword) to semantically measure relevance against the prompt.
    // When no search keyword is provided, candidates remain ordered deterministically by Layer 2 ranking_score.
    // ────────────────────────────────────────────
    let aiReranked = false;
    if (jobIdForMatch && keyword && filtered.length > 1) {
      console.log(`[talent-search] 🤖 Gemini Layer B: reranking top ${Math.min(filtered.length, 50)} candidates for job ${jobIdForMatch}...`);
      const rerankInput = filtered.slice(0, 50).map((t) => ({
        id: t.user_id,
        title: t.headline,
        skills: t.skills,
        summary: t.summary,
      }));
      const { ranked_ids, used_ai } = await rerankCandidatesWithGemini(keyword, rerankInput);
      if (used_ai && ranked_ids.length > 0) {
        aiReranked = true;
        const rankMap = new Map(ranked_ids.map((id, idx) => [id, idx]));
        const top50Reranked = filtered
          .slice(0, 50)
          .sort((a, b) => (rankMap.get(a.user_id) ?? 99) - (rankMap.get(b.user_id) ?? 99));
        filtered = [...top50Reranked, ...filtered.slice(50)];
        console.log(`[talent-search] 🤖 Gemini Layer B: ✅ reranked ${ranked_ids.length} candidates`);
      } else {
        console.log(`[talent-search] ⚠️  Gemini Layer B: rerank failed or skipped — keeping Layer 2 order`);
      }
    }

    const paginated = filtered.slice((page - 1) * limit, page * limit);

    // ────────────────────────────────────────────
    // 7. Gemini Layer C: Match Explanations (Lazy execution on drawer open)
    // Note: Layer C match explanations are handled lazily via POST /api/client/talent-search/explain
    // when a candidate profile drawer is opened by the recruiter, preventing unnecessary Gemini API calls on page turns.
    // ────────────────────────────────────────────

    return NextResponse.json({
      search_mode: searchMode,
      search_context: searchMode === "search" ? taxonomyContext : null,
      talents: paginated,
      total,
      page,
      limit,
      ai_reranked: aiReranked,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[talent-search GET] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
