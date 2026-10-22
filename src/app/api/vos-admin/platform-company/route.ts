import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_jwt_secret_change_me");

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function getPHDateTimeString(): string {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return dtf.format(now);
}

async function getAdminUserFromToken(req: NextRequest): Promise<{ adminId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1 };
  }
  const cookieStore = await cookies();
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    cookieStore.get("vos_sync_access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id || 1);
    return { adminId };
  } catch {
    return { adminId: 1 };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus API base URL not configured" }, { status: 500 });
    }

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_platform_company?sort[]=display_order&sort[]=-is_primary&limit=-1`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Failed to fetch platform companies" },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data || [] });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Directus API base URL not configured" }, { status: 500 });
    }

    const body = await req.json();

    if (!body.company_name?.trim() || !body.company_legal_name?.trim() || !body.company_code?.trim()) {
      return NextResponse.json(
        { error: "Company name, legal name, and company code are required" },
        { status: 400 }
      );
    }

    const isPrimary = Number(body.is_primary) === 1 || body.is_primary === true ? 1 : 0;

    // If new company is set as primary, demote all other companies to is_primary = 0
    if (isPrimary === 1) {
      const existingRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_platform_company?filter[is_primary][_eq]=1&fields=company_id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const primaryItems: Array<{ company_id: number }> = existingData.data || [];
        for (const item of primaryItems) {
          await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${item.company_id}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({ is_primary: 0 }),
          });
        }
      }
    }

    const now = getPHDateTimeString();
    const payload = {
      ...body,
      is_primary: isPrimary,
      is_active: Number(body.is_active) === 1 || body.is_active === true ? 1 : 0,
      display_order: Number(body.display_order) || 0,
      created_by_user_id: auth?.adminId ?? 1,
      updated_by_user_id: auth?.adminId ?? 1,
      created_at: now,
      updated_at: now,
    };

    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Failed to create platform company" },
        { status: createRes.status }
      );
    }

    const createdJson = await createRes.json();
    return NextResponse.json({ data: createdJson.data }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
