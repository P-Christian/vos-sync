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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${id}`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Platform company not found" }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({ data: json.data });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const isPrimary =
      body.is_primary !== undefined
        ? Number(body.is_primary) === 1 || body.is_primary === true
          ? 1
          : 0
        : undefined;

    // If setting this record to primary, unset all other records to 0
    if (isPrimary === 1) {
      const existingRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_platform_company?filter[is_primary][_eq]=1&fields=company_id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const primaryItems: Array<{ company_id: number }> = existingData.data || [];
        for (const item of primaryItems) {
          if (String(item.company_id) !== String(id)) {
            await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${item.company_id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ is_primary: 0 }),
            });
          }
        }
      }
    }

    const now = getPHDateTimeString();
    const updatePayload: Record<string, unknown> = {
      ...body,
      updated_at: now,
      updated_by_user_id: auth?.adminId ?? 1,
    };

    if (isPrimary !== undefined) {
      updatePayload.is_primary = isPrimary;
    }
    if (body.is_active !== undefined) {
      updatePayload.is_active = Number(body.is_active) === 1 || body.is_active === true ? 1 : 0;
    }
    if (body.display_order !== undefined) {
      updatePayload.display_order = Number(body.display_order) || 0;
    }

    const updateRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Failed to update platform company" },
        { status: updateRes.status }
      );
    }

    const updatedJson = await updateRes.json();
    return NextResponse.json({ data: updatedJson.data });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleteRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Failed to delete platform company" },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
