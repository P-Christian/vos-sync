// src/app/api/client/jobs/categories/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_ROLE_CATEGORIES } from "@/modules/client/jobs/hooks/useRoleCategories";
import { getPHTimeString } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.75, minLen / maxLen);
  }

  // Token Jaccard index
  const words1 = new Set(s1.split(/[\s&/,-]+/));
  const words2 = new Set(s2.split(/[\s&/,-]+/));
  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w) && w.length > 2) intersection++;
  });
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const categoryName = (body.category_name || "").trim();
    const description = (body.description || "").trim();
    const companyId = body.company_id ? Number(body.company_id) : null;
    const userId = body.user_id ? Number(body.user_id) : null;

    if (!categoryName) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    // 1. Fetch active categories
    let existingCategories = CANONICAL_ROLE_CATEGORIES;
    if (DIRECTUS_BASE) {
      try {
        const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_category?limit=-1`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            existingCategories = json.data;
          }
        }
      } catch {
        // use fallback
      }
    }

    // 2. Semantic matching against existing taxonomy
    let bestMatch = null;
    let highestConfidence = 0;

    for (const cat of existingCategories) {
      const scoreName = calculateSimilarity(categoryName, cat.category_name);
      const scoreCode = calculateSimilarity(categoryName, cat.category_code);
      const maxScore = Math.max(scoreName, scoreCode);

      if (maxScore > highestConfidence) {
        highestConfidence = maxScore;
        bestMatch = cat;
      }
    }

    // If exact or very high confidence match (>= 80%)
    if (highestConfidence >= 0.80 && bestMatch) {
      return NextResponse.json({
        has_existing_match: true,
        confidence: Math.round(highestConfidence * 100),
        existing_category: bestMatch,
        message: `A close matching category "${bestMatch.category_name}" already exists.`,
      });
    }

    // 3. Insert into vs_role_category_suggestion
    const nowPH = getPHTimeString();
    let suggestionId: number | null = null;

    if (DIRECTUS_BASE) {
      try {
        const insertRes = await fetch(`${DIRECTUS_BASE}/items/vs_role_category_suggestion`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            category_name: categoryName,
            category_description: description,
            company_id: companyId,
            suggested_by_user_id: userId,
            status: "PENDING",
            created_at: nowPH,
            updated_at: nowPH,
          }),
        });

        if (insertRes.ok) {
          const json = await insertRes.json();
          suggestionId = json.data?.suggestion_id ?? json.data?.id ?? null;
        }
      } catch {
        // graceful persistence
      }
    }

    return NextResponse.json({
      success: true,
      has_existing_match: false,
      confidence: Math.round(highestConfidence * 100),
      closest_match: highestConfidence >= 0.45 ? bestMatch : null,
      suggestion_id: suggestionId,
      suggested_name: categoryName,
      message: "Category suggestion submitted for admin review. You may continue publishing your job.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Server error" },
      { status: 500 }
    );
  }
}
