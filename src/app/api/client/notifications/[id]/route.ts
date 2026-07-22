// src/app/api/client/notifications/[id]/route.ts

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

// ─── PATCH — Mark single notification as read ─────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = parseInt(id, 10);

    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID." },
        { status: 400 }
      );
    }

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

    // Verify the notification belongs to this user before updating
    const checkRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification/${notificationId}?fields=notification_id,user_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!checkRes.ok) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    const checkJson = await checkRes.json();
    const notification = checkJson.data;

    if (!notification || Number(notification.user_id) !== userId) {
      return NextResponse.json(
        { error: "Not authorized to update this notification." },
        { status: 403 }
      );
    }

    // Mark as read
    const patchRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification/${notificationId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_read: 1 }),
      }
    );

    if (!patchRes.ok) {
      const text = await patchRes.text();
      console.error("Directus mark-read error:", text);
      return NextResponse.json(
        { error: "Failed to mark notification as read." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("PATCH /api/client/notifications/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
