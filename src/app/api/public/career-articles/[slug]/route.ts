// src/app/api/public/career-articles/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { formatAssetUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const queryParams = new URLSearchParams();
    queryParams.append("filter[slug][_eq]", slug);
    queryParams.append("filter[status][_eq]", "PUBLISHED");
    queryParams.append("limit", "1");

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_career_articles?${queryParams.toString()}`, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
    }

    const json = await res.json();
    const article = json.data?.[0];

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Format content and cover images
    const formattedArticle = {
      ...article,
      featured_image_url: formatAssetUrl(article.featured_image_url) || article.featured_image_url,
      is_featured: Boolean(article.is_featured === 1 || article.is_featured === true),
    };

    return NextResponse.json({ data: formattedArticle });
  } catch (err: unknown) {
    console.error("[api/public/career-articles/[slug] GET] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to load article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
