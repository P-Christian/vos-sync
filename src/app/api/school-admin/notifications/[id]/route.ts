// src/app/api/school-admin/notifications/[id]/route.ts
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json();
    const isRead = body.is_read;

    // Check if notification belongs to user
    const checkRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification/${id}?fields=user_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!checkRes.ok) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    const checkJson = await checkRes.json();
    const notification = checkJson.data;

    if (!notification || notification.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    // Update notification
    const updateRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_freelancer_notification/${id}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_read: isRead }),
      }
    );

    if (!updateRes.ok) {
      return NextResponse.json({ error: "Failed to update notification." }, { status: updateRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("PATCH /api/school-admin/notifications/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
