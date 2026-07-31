// src/app/api/public/find-jobs/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getDirectusHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function normalizeString(val: string): string {
  return val
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
}

function formatJobType(val: string): string {
  const norm = normalizeString(val);
  if (norm === "full time" || norm === "fulltime") return "Full Time";
  if (norm === "part time" || norm === "parttime") return "Part Time";
  if (norm === "freelance") return "Freelance";
  if (norm === "contract") return "Contract";
  if (norm === "internship") return "Internship";
  return val.replace(/[_-]+/g, " ");
}

function formatWorkSetup(val: string): string {
  const norm = normalizeString(val);
  if (norm.includes("remote")) return "Remote";
  if (norm.includes("hybrid")) return "Hybrid";
  if (norm.includes("site") || norm.includes("office")) return "On-site";
  return val.replace(/[_-]+/g, " ");
}

/**
 * Tokenized per-word location matching
 */
function matchesLocation(locationInput: string, targetText: string): boolean {
  if (!locationInput || !locationInput.trim()) return true;

  const rawLower = locationInput.toLowerCase().trim();
  const targetLower = targetText.toLowerCase();

  const tokens = rawLower
    .split(/[\s,.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t !== "philippines" && t !== "ph" && t !== "city");

  if (tokens.length === 0) {
    return targetLower.includes(rawLower);
  }

  return tokens.every((token) => targetLower.includes(token));
}

/**
 * Computes relevance score strictly matching Job Title, Company Name, and Category
 * (Excludes job description to prevent false positive matches on unrelated roles)
 */
function computeRelevanceScore(
  query: string,
  jobTitle: string,
  companyName: string,
  category: string
): number {
  if (!query) return 0;

  const qLower = query.toLowerCase().trim();
  const titleLower = jobTitle.toLowerCase().trim();
  const compLower = companyName.toLowerCase().trim();
  const catLower = category.toLowerCase().trim();

  let score = 0;

  // 1. Complete exact match on Title or Company Name
  if (titleLower === qLower) score += 1000;
  if (compLower === qLower) score += 800;
  if (catLower === qLower) score += 600;

  // 2. Title / Company starts with query phrase
  if (titleLower.startsWith(qLower)) score += 500;
  if (compLower.startsWith(qLower)) score += 400;

  // 3. Title / Company contains full phrase
  if (titleLower.includes(qLower)) score += 300;
  if (compLower.includes(qLower)) score += 200;
  if (catLower.includes(qLower)) score += 150;

  // 4. Token / Word match scoring
  const tokens = qLower.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length > 0) {
    tokens.forEach((token) => {
      if (titleLower.includes(token)) score += 60;
      if (compLower.includes(token)) score += 40;
      if (catLower.includes(token)) score += 30;
    });
  }

  return score;
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus API base URL not configured." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const jobType = searchParams.get("job_type")?.trim() || "";
    const workSetup = searchParams.get("work_setup")?.trim() || "";
    const location = searchParams.get("location")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") || 12), 50);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const offset = (page - 1) * limit;

    // Fetch active job postings from Directus
    const jobsUrl = `${DIRECTUS_BASE}/items/vs_job_posting?filter[status][_eq]=ACTIVE&sort[]=-created_at&limit=200&fields=*`;
    const jobsRes = await fetch(jobsUrl, { headers: getDirectusHeaders(), cache: "no-store" });

    let rawJobs: Record<string, unknown>[] = [];
    if (jobsRes.ok) {
      const jobsJson = await jobsRes.json();
      rawJobs = jobsJson.data || [];
    } else {
      const fallbackUrl = `${DIRECTUS_BASE}/items/vs_job_posting?sort[]=-created_at&limit=200&fields=*`;
      const fallbackRes = await fetch(fallbackUrl, { headers: getDirectusHeaders(), cache: "no-store" });
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        rawJobs = fallbackJson.data || [];
      }
    }

    // Fetch company details for master data lookup
    const companyIds = Array.from(new Set(rawJobs.map((j) => Number(j.company_id)).filter(Boolean)));
    const companyMap: Record<number, Record<string, unknown>> = {};

    if (companyIds.length > 0) {
      const compUrl = `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=company_id,company_name,company_logo,company_city,company_province,company_address,company_website,verification_status&limit=-1`;
      const compRes = await fetch(compUrl, { headers: getDirectusHeaders(), cache: "no-store" });
      if (compRes.ok) {
        const compJson = await compRes.json();
        (compJson.data || []).forEach((c: Record<string, unknown>) => {
          companyMap[Number(c.company_id)] = c;
        });
      }
    }

    // Keyword Search with Relevance Sorting (Strictly Title, Company, and Category)
    if (q) {
      const scoredJobs = rawJobs
        .map((j) => {
          const cid = Number(j.company_id);
          const comp = companyMap[cid] || {};
          const title = String(j.job_title || "");
          const compName = String(comp.company_name || j.company_name || "");
          const category = String(j.job_category || "");

          const score = computeRelevanceScore(q, title, compName, category);
          return { job: j, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      rawJobs = scoredJobs.map((item) => item.job);
    }

    // Job Type Filter (Normalized comparison: FULL_TIME, Full-Time -> Full Time)
    if (jobType && jobType.toLowerCase() !== "all") {
      const targetTypeNorm = normalizeString(jobType);
      rawJobs = rawJobs.filter((j) => {
        const rawTypeNorm = normalizeString(String(j.job_type || ""));
        return rawTypeNorm === targetTypeNorm;
      });
    }

    // Work Setup Filter (Normalized comparison: Remote, On-site, Hybrid)
    if (workSetup && workSetup.toLowerCase() !== "all") {
      const targetSetupNorm = normalizeString(workSetup);
      rawJobs = rawJobs.filter((j) => {
        const rawSetupNorm = normalizeString(String(j.work_arrangement || j.work_setup || ""));
        return rawSetupNorm.includes(targetSetupNorm) || targetSetupNorm.includes(rawSetupNorm);
      });
    }

    // Per-Word Location Filter
    if (location) {
      rawJobs = rawJobs.filter((j) => {
        const cid = Number(j.company_id);
        const comp = companyMap[cid] || {};
        const compLoc = [comp.company_city, comp.company_province, comp.company_address].filter(Boolean).join(" ");
        const jobLoc = String(j.job_location || j.location || "");
        const fullLocationText = `${jobLoc} ${compLoc} Philippines`;
        return matchesLocation(location, fullLocationText);
      });
    }

    const totalCount = rawJobs.length;
    const paginatedJobs = rawJobs.slice(offset, offset + limit);

    // Format output with normalized strings
    const formattedJobs = paginatedJobs.map((j) => {
      const cid = Number(j.company_id);
      const comp = companyMap[cid] || {};
      const logoRaw = (comp.company_logo || j.company_logo) as string | null;

      const logoUrl = logoRaw
        ? logoRaw.startsWith("http") || logoRaw.startsWith("/")
          ? logoRaw
          : `/api/assets/${logoRaw}`
        : null;

      const compLoc = [comp.company_city, comp.company_province].filter(Boolean).join(", ");
      const jobLoc = (j.job_location || j.location as string) || compLoc || "Philippines";

      return {
        job_id: Number(j.job_id || j.id),
        company_id: cid,
        company_name: (comp.company_name as string) || (j.company_name as string) || "Hiring Organization",
        company_logo_url: logoUrl,
        company_location: compLoc || jobLoc,
        company_verification_status: comp.verification_status || "VERIFIED",

        job_title: String(j.job_title || "Open Position"),
        job_description: String(j.job_description || ""),
        job_type: formatJobType(String(j.job_type || "Full Time")),
        work_setup: formatWorkSetup(String(j.work_arrangement || j.work_setup || "On-site")),
        location: jobLoc,

        salary_min: j.salary_min != null ? Number(j.salary_min) : null,
        salary_max: j.salary_max != null ? Number(j.salary_max) : null,
        salary_currency: (j.currency || j.salary_currency as string) || "PHP",
        show_salary_range: j.show_salary_range ?? true,

        experience_level: String(j.experience_level || "Not Specified"),
        status: String(j.status || "ACTIVE"),
        created_at: String(j.created_at || j.date_created || new Date().toISOString()),
      };
    });

    return NextResponse.json({
      data: formattedJobs,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/public/find-jobs error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
