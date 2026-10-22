import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET() {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json({ data: null, error: "Directus API base URL not configured" }, { status: 500 });
    }

    // 1. First attempt to fetch the active primary company
    const primaryRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_platform_company?filter[is_primary][_eq]=1&filter[is_active][_eq]=1&limit=1`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (primaryRes.ok) {
      const primaryJson = await primaryRes.json();
      if (primaryJson.data && primaryJson.data.length > 0) {
        return NextResponse.json({ data: primaryJson.data[0] });
      }
    }

    // 2. Fallback to any active company ordered by display_order
    const fallbackRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_platform_company?filter[is_active][_eq]=1&sort[]=display_order&limit=1`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson.data && fallbackJson.data.length > 0) {
        return NextResponse.json({ data: fallbackJson.data[0] });
      }
    }

    return NextResponse.json({ data: null });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ data: null, error: err.message || "Failed to fetch platform company" }, { status: 500 });
  }
}
