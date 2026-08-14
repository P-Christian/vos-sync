// src/app/api/vos-admin/job-roles/ai-suggest/route.ts
// Single batched Gemini call → keywords + skills + description for a role.
// Server-side in-memory cache (10 min TTL) prevents duplicate RPD consumption.

import { NextRequest, NextResponse } from "next/server";
import { callGeminiMonitored } from "@/lib/gemini/geminiMonitoring";
import { evaluateTaxonomyProposal, GovernanceResult } from "@/modules/vos-admin/role-matching/services/taxonomy/taxonomyGovernanceService";

export const revalidate = 0;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiSuggestedKeyword {
  alias: string;
  weight: number;
  type: "SYNONYM" | "KEYWORD" | "ABBREVIATION" | "EXACT";
}

export interface AiSuggestedSkill {
  skill_name: string;
  importance_weight: number;
  is_required: boolean;
}

export interface AiSuggestResult {
  description: string;
  keywords: AiSuggestedKeyword[];
  skills: AiSuggestedSkill[];
  cached: boolean;
  governance?: GovernanceResult;
}

// ── Server-side cache (module-level, survives between requests) ───────────────

interface CacheEntry {
  data: Omit<AiSuggestResult, "cached">;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const suggestCache = new Map<string, CacheEntry>();

function getCacheKey(roleName: string, categoryName: string): string {
  return `${roleName.trim().toLowerCase()}::${categoryName.trim().toLowerCase()}`;
}

function getFromCache(key: string): Omit<AiSuggestResult, "cached"> | null {
  const entry = suggestCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    suggestCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Omit<AiSuggestResult, "cached">): void {
  suggestCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(roleName: string, categoryName: string): string {
  return `You are a job taxonomy expert for a Philippine job marketplace.

For the standard job role "${roleName}" in the category "${categoryName}", provide accurate suggestions.

Return ONLY a valid JSON object with exactly this structure (no markdown, no extra text):
{
  "description": "One professional sentence (max 120 chars) describing what this role does.",
  "keywords": [
    { "alias": "lowercase alias or synonym", "weight": 0.50-1.00, "type": "SYNONYM|KEYWORD|ABBREVIATION|EXACT" }
  ],
  "skills": [
    { "skill_name": "Exact skill name", "importance_weight": 0.50-1.00, "is_required": true|false }
  ]
}

Rules:
- keywords: 8 to 10 items. Common search terms, abbreviations, and alternate job titles. All lowercase. weight >= 0.50.
- skills: 5 to 8 items. Real technical or professional skills. importance_weight = 1.0 for core required, 0.6-0.8 for bonus. is_required = true only for non-negotiable skills.
- Return ONLY valid JSON. No markdown fences, no explanation text.`;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseGeminiResponse(raw: string): Omit<AiSuggestResult, "cached"> | null {
  try {
    let cleaned = raw.trim();

    // Strip markdown code fences if present anywhere
    const matchJsonFence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (matchJsonFence && matchJsonFence[1]) {
      cleaned = matchJsonFence[1].trim();
    }

    // Isolate JSON object between first '{' and last '}'
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1);
    }

    const parsed = JSON.parse(cleaned) as {
      description?: string;
      keywords?: { alias?: string; weight?: number; type?: string }[];
      skills?: { skill_name?: string; importance_weight?: number; is_required?: boolean }[];
    };

    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    const keywords: AiSuggestedKeyword[] = (parsed.keywords ?? [])
      .filter((k) => typeof k.alias === "string" && k.alias.trim())
      .map((k) => ({
        alias: k.alias!.trim().toLowerCase(),
        weight: Math.min(1.0, Math.max(0.5, Number(k.weight) || 0.8)),
        type: (["SYNONYM", "KEYWORD", "ABBREVIATION", "EXACT"].includes(k.type ?? "") ? k.type! : "SYNONYM") as AiSuggestedKeyword["type"],
      }));

    const skills: AiSuggestedSkill[] = (parsed.skills ?? [])
      .filter((s) => typeof s.skill_name === "string" && s.skill_name.trim())
      .map((s) => ({
        skill_name: s.skill_name!.trim(),
        importance_weight: Math.min(1.0, Math.max(0.1, Number(s.importance_weight) || 0.8)),
        is_required: Boolean(s.is_required),
      }));

    return { description, keywords, skills };
  } catch {
    console.error("[ai-suggest] ❌ JSON parsing failed. Raw response snippet:", raw.slice(0, 300));
    return null;
  }
}




// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    status: "online",
    endpoint: "/api/vos-admin/job-roles/ai-suggest",
    methods: ["POST"],
    description: "Generates job role keywords, skills, and descriptions using Gemini AI.",
  });
}

function getUserIdFromReq(req: NextRequest): number {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken =
      req.cookies.get("vos_access_token")?.value ||
      req.cookies.get("directus_token")?.value ||
      req.cookies.get("token")?.value ||
      req.cookies.get("next-auth.session-token")?.value;
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : cookieToken;
    if (token) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        const id = payload?.user_id ?? payload?.id ?? payload?.sub;
        if (id !== undefined && !isNaN(Number(id))) {
          return Number(id);
        }
      }
    }
  } catch {
    // ignore parse error
  }
  return 1; // Default admin user ID for admin portal requests
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const roleName: string = (body.role_name ?? "").trim();
    const categoryName: string = (body.category_name ?? "General").trim();

    console.log(`\n==================== [AI SUGGEST DEBUG] ====================`);
    console.log(`[ai-suggest] 📥 INPUT: role_name="${roleName}", category_name="${categoryName}"`);

    if (!roleName) {
      console.warn(`[ai-suggest] ⚠️ Invalid input: role_name is empty`);
      return NextResponse.json({ error: "role_name is required" }, { status: 400 });
    }

    const cacheKey = getCacheKey(roleName, categoryName);

    // Cache hit — return without consuming RPD
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[ai-suggest] ⚡ CACHE HIT for "${cacheKey}" — returning cached data (0 RPD used)`);
      console.log(`[ai-suggest] 📦 CACHED PAYLOAD:`, JSON.stringify(cached, null, 2));
      console.log(`============================================================\n`);
      return NextResponse.json({ ...cached, cached: true });
    }


    // Cache miss — call Gemini (1 RPD consumed)
    console.log(`[ai-suggest] 🌐 CACHE MISS for "${cacheKey}" — calling Gemini AI...`);
    const prompt = buildPrompt(roleName, categoryName);
    const userId = getUserIdFromReq(req);
    const raw = await callGeminiMonitored({
      prompt,
      feature: "ROLE_INTELLIGENCE",
      endpoint: "/api/vos-admin/job-roles/ai-suggest",
      timeoutMs: 15000,
      userId,
    });


    console.log(`[ai-suggest] 🤖 RAW GEMINI RESPONSE:\n`, raw || "(null/empty)");

    if (!raw) {
      console.error(`[ai-suggest] ❌ Gemini API returned no text (null/empty)`);
      console.log(`============================================================\n`);
      return NextResponse.json(
        { error: "Gemini returned no response. Check rate limits or API key." },
        { status: 503 }
      );
    }

    const result = parseGeminiResponse(raw);
    if (!result) {
      console.error(`[ai-suggest] ❌ Failed to parse JSON structure from Gemini response`);
      console.log(`============================================================\n`);
      return NextResponse.json(
        { error: "Failed to parse Gemini response." },
        { status: 500 }
      );
    }

    console.log(`[ai-suggest] ✅ PARSED STRUCTURED AI RESULT:`);
    console.log(`  - Description: "${result.description}"`);
    console.log(`  - Keywords count: ${result.keywords.length}`, result.keywords);
    console.log(`  - Skills count: ${result.skills.length}`, result.skills);

    // ── Run Shared Taxonomy Governance Evaluation ─────────────────────────────
    console.log(`[ai-suggest] 🛡️ Running Taxonomy Governance Pipeline...`);
    const governance = await evaluateTaxonomyProposal({
      roleName,
      categoryName,
      keywords: result.keywords.map((k) => ({ name: k.alias, weight: k.weight, type: k.type })),
      skills: result.skills.map((s) => ({ name: s.skill_name, weight: s.importance_weight, isRequired: s.is_required })),
    });

    console.log(`============================================================\n`);

    const finalResult = { ...result, governance };
    setCache(cacheKey, result);
    return NextResponse.json({ ...finalResult, cached: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error(`[ai-suggest] 💥 ERROR:`, msg);
    console.log(`============================================================\n`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

