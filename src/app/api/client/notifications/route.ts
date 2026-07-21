// src/app/api/client/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8")
    );
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

// ─── GET — Fetch notifications for logged-in user ─────────────────────────

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

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Build filter query against vs_freelancer_notification
    let filterQuery = `filter[user_id][_eq]=${userId}`;
    if (unreadOnly) {
      filterQuery += `&filter[is_read][_eq]=0`;
    }

    // Fetch notifications + join event data via Directus relational fields
    const notifRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification?${filterQuery}&sort[]=-created_at&limit=${limit}&offset=${offset}&fields=notification_id,user_id,event_id,category,title,message,action_url,is_read,created_at,event_id.event_type,event_id.entity_type,event_id.entity_id`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (!notifRes.ok) {
      const text = await notifRes.text();
      console.error("Directus notifications fetch error:", text);
      return NextResponse.json(
        { error: "Failed to fetch notifications." },
        { status: notifRes.status }
      );
    }

    const notifJson = await notifRes.json();
    const rawData: Record<string, unknown>[] = notifJson.data ?? [];

    // Normalize the nested event join fields
    const notifications = rawData.map((n) => {
      const event = n.event_id as Record<string, unknown> | null;
      return {
        notification_id: n.notification_id,
        user_id: n.user_id,
        event_id: typeof event === "object" && event !== null
          ? (event.event_id ?? null)
          : n.event_id,
        category: n.category,
        title: n.title,
        message: n.message,
        action_url: n.action_url ?? null,
        is_read: n.is_read === 1 || n.is_read === true,
        created_at: n.created_at,
        // from event join
        event_type: typeof event === "object" && event !== null
          ? (event.event_type ?? null)
          : null,
        entity_type: typeof event === "object" && event !== null
          ? (event.entity_type ?? null)
          : null,
        entity_id: typeof event === "object" && event !== null
          ? (event.entity_id ?? null)
          : null,
      };
    });

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    console.error("GET /api/client/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH — Mark ALL notifications as read for the user ─────────────────

export async function PATCH(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));

    if (!body.mark_all_read) {
      return NextResponse.json(
        { error: "Invalid request. Send { mark_all_read: true }." },
        { status: 400 }
      );
    }

    // Fetch all unread notification IDs for this user
    const listRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification?filter[user_id][_eq]=${userId}&filter[is_read][_eq]=0&fields=notification_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    const listJson = await listRes.json();
    const ids: number[] = (listJson.data ?? []).map(
      (n: { notification_id: number }) => n.notification_id
    );

    if (ids.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    // Bulk update via Directus batch update
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
      const text = await patchRes.text();
      console.error("Directus bulk mark-read error:", text);
      return NextResponse.json(
        { error: "Failed to mark notifications as read." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err: unknown) {
    console.error("PATCH /api/client/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
