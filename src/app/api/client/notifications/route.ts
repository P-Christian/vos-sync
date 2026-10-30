// src/app/api/client/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isClientSession } from "@/lib/authenticated-session";

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

async function getUnreadCount(userId: number): Promise<number> {
  try {
    const countRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_employer_notification?filter[user_id][_eq]=${userId}&filter[is_read][_eq]=0&fields=notification_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!countRes.ok) return 0;
    const countJson = await countRes.json();
    return (countJson.data ?? []).length;
  } catch {
    return 0;
  }
}

// ─── GET — Fetch notifications for logged-in user ─────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread_only") === "true";
    const starredOnly = searchParams.get("starred_only") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Build filter query against vs_employer_notification
    let filterQuery = `filter[user_id][_eq]=${userId}`;
    if (unreadOnly) {
      filterQuery += `&filter[is_read][_eq]=0`;
    }
    if (starredOnly) {
      filterQuery += `&filter[is_starred][_eq]=1`;
    }

    // Fetch notifications flat
    let notifRes: Response;
    try {
      notifRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_employer_notification?${filterQuery}&sort[]=-created_at&limit=${limit}&offset=${offset}&fields=notification_id,user_id,event_id,category,title,message,action_url,is_read,is_starred,created_at`,
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      );
    } catch (fetchErr: unknown) {
      console.warn("[Employer notifications] Upstream socket/network error:", fetchErr instanceof Error ? fetchErr.message : fetchErr);
      return NextResponse.json({ notifications: [] }, { status: 200 });
    }

    if (!notifRes.ok) {
      const text = await notifRes.text().catch(() => "");
      console.error("[Employer notifications] Directus fetch error:", text);
      return NextResponse.json(
        { error: "Failed to fetch notifications." },
        { status: notifRes.status }
      );
    }

    const notifJson = await notifRes.json();
    const rawData: Record<string, unknown>[] = notifJson.data ?? [];

    // Normalize — all display info (title, message, category, is_read, is_starred)
    const notifications = rawData.map((n) => ({
      notification_id: n.notification_id,
      user_id: n.user_id,
      event_id: typeof n.event_id === "number" ? n.event_id : null,
      category: n.category,
      title: n.title,
      message: n.message,
      action_url: n.action_url ?? null,
      is_read: n.is_read === 1 || n.is_read === true,
      is_starred: n.is_starred === 1 || n.is_starred === true,
      created_at: n.created_at,
      event_type: null,
      entity_type: null,
      entity_id: null,
    }));

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    console.error("GET /api/client/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH — Bulk update notification status or mark all as read ──────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;
    const body = await req.json().catch(() => ({}));

    // Mode 1: Mark all as read
    if (body.mark_all_read) {
      const listRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_employer_notification?filter[user_id][_eq]=${userId}&filter[is_read][_eq]=0&fields=notification_id&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );

      const listJson = await listRes.json();
      const ids: number[] = (listJson.data ?? []).map(
        (n: { notification_id: number }) => n.notification_id
      );

      if (ids.length === 0) {
        return NextResponse.json({ success: true, updated: 0, unread_count: 0 });
      }

      const patchRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_employer_notification`,
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

      return NextResponse.json({ success: true, updated: ids.length, unread_count: 0 });
    }

    // Mode 2: Bulk update specific notification_ids
    if (Array.isArray(body.notification_ids)) {
      const targetIds = body.notification_ids
        .map((id: unknown) => Number(id))
        .filter((id: number) => !isNaN(id) && id > 0);

      if (targetIds.length === 0) {
        return NextResponse.json(
          { error: "Invalid notification_ids list." },
          { status: 400 }
        );
      }

      const patchData: Record<string, unknown> = {};
      if (typeof body.is_read === "boolean") {
        patchData.is_read = body.is_read ? 1 : 0;
      }
      if (typeof body.is_starred === "boolean") {
        patchData.is_starred = body.is_starred ? 1 : 0;
      }
      if (Object.keys(patchData).length === 0) {
        patchData.is_read = 1;
      }

      // Verify ownership
      const checkRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_employer_notification?filter[user_id][_eq]=${userId}&filter[notification_id][_in]=${targetIds.join(",")}&fields=notification_id&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );

      if (!checkRes.ok) {
        return NextResponse.json(
          { error: "Failed to verify notifications." },
          { status: checkRes.status }
        );
      }

      const checkJson = await checkRes.json();
      const verifiedIds: number[] = (checkJson.data ?? []).map(
        (n: { notification_id: number }) => n.notification_id
      );

      if (verifiedIds.length === 0) {
        const unreadCount = await getUnreadCount(userId);
        return NextResponse.json({ success: true, updated: 0, unread_count: unreadCount });
      }

      const patchRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_employer_notification`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            keys: verifiedIds,
            data: patchData,
          }),
        }
      );

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error("Directus bulk update status error:", text);
        return NextResponse.json(
          { error: "Failed to update notification status." },
          { status: patchRes.status }
        );
      }

      const unreadCount = await getUnreadCount(userId);
      return NextResponse.json({
        success: true,
        updated: verifiedIds.length,
        unread_count: unreadCount,
      });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide mark_all_read: true or notification_ids array." },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("PATCH /api/client/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE — Bulk delete notifications for the user ──────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;
    const body = await req.json().catch(() => ({}));

    if (!Array.isArray(body.notification_ids)) {
      return NextResponse.json(
        { error: "Invalid request. Provide notification_ids array." },
        { status: 400 }
      );
    }

    const targetIds = body.notification_ids
      .map((id: unknown) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: "No valid notification IDs provided." },
        { status: 400 }
      );
    }

    // Verify ownership
    const checkRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_employer_notification?filter[user_id][_eq]=${userId}&filter[notification_id][_in]=${targetIds.join(",")}&fields=notification_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!checkRes.ok) {
      return NextResponse.json(
        { error: "Failed to verify notifications." },
        { status: checkRes.status }
      );
    }

    const checkJson = await checkRes.json();
    const verifiedIds: number[] = (checkJson.data ?? []).map(
      (n: { notification_id: number }) => n.notification_id
    );

    if (verifiedIds.length === 0) {
      const unreadCount = await getUnreadCount(userId);
      return NextResponse.json({ success: true, deleted: 0, unread_count: unreadCount });
    }

    const delRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_employer_notification`,
      {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify(verifiedIds),
      }
    );

    if (!delRes.ok) {
      const text = await delRes.text();
      console.error("Directus bulk delete error:", text);
      return NextResponse.json(
        { error: "Failed to delete notifications." },
        { status: delRes.status }
      );
    }

    const unreadCount = await getUnreadCount(userId);
    return NextResponse.json({
      success: true,
      deleted: verifiedIds.length,
      unread_count: unreadCount,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/client/notifications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
