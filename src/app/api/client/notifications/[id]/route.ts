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

    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

    // Verify the notification belongs to this user before updating
    const checkRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_employer_notification/${notificationId}?fields=notification_id,user_id`,
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
      `${DIRECTUS_BASE}/items/vs_employer_notification/${notificationId}`,
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
