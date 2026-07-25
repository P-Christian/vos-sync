// src/app/api/freelancer/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";

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
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let filterQuery = `filter[user_id][_eq]=${userId}`;
    if (unreadOnly) {
      filterQuery += `&filter[is_read][_eq]=0`;
    }

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification?${filterQuery}&sort[]=-created_at&limit=${limit}&offset=${offset}`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to load notifications." },
        { status: res.status }
      );
    }

    const json = await res.json();
    const notifications = json.data ?? [];
    
    // Count total unread notifications for this user (not bounded by page limit)
    const countRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification?filter[user_id][_eq]=${userId}&filter[is_read][_eq]=0&limit=0&meta=filter_count`,
      { headers: getHeaders(), cache: "no-store" }
    );
    let unreadCount = 0;
    if (countRes.ok) {
      const countJson = await countRes.json();
      unreadCount = countJson.meta?.filter_count ?? 0;
    } else {
      unreadCount = notifications.filter((n: any) => n.is_read === false || n.is_read === 0).length;
    }

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: unknown) {
    console.error("GET /api/freelancer/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.mark_all_read) {
      return NextResponse.json(
        { error: "Invalid request. Send { mark_all_read: true }." },
        { status: 400 }
      );
    }

    // Fetch unread notification IDs for this freelancer
    const listRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification?filter[user_id][_eq]=${userId}&filter[is_read][_eq]=0&fields=notification_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to fetch unread notifications." },
        { status: listRes.status }
      );
    }

    const listJson = await listRes.json();
    const ids: number[] = (listJson.data ?? []).map(
      (n: { notification_id: number }) => n.notification_id
    );

    if (ids.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    // Bulk update to mark read
    const patchRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          keys: ids,
          data: { is_read: 1 },
        }),
      }
    );

    if (!patchRes.ok) {
      const err = await patchRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to mark all as read." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err: unknown) {
    console.error("PATCH /api/freelancer/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

