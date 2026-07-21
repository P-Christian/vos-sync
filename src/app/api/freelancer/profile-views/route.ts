// src/app/api/freelancer/profile-views/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

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

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const viewerUserId = getUserIdFromToken(token);
    if (!viewerUserId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.viewed_user_id) {
      return NextResponse.json({ error: "viewed_user_id is required." }, { status: 400 });
    }

    const viewedUserId = Number(body.viewed_user_id);

    // Skip tracking if user views their own profile
    if (viewedUserId === viewerUserId) {
      return NextResponse.json({ success: true, message: "Ignored self-view" });
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const payload = {
      viewed_user_id: viewedUserId,
      viewer_user_id: viewerUserId,
      viewed_at: nowPH,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_profile_view`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to log profile view." },
        { status: res.status }
      );
    }

    // Trigger notification
    await createNotification({
      event_type: "profile_view",
      recipient_user_id: viewedUserId,
      entity_type: "user",
      entity_id: viewerUserId,
      category: "Profile Activity",
      title: "New Profile View",
      message: "Someone has viewed your profile recently.",
      action_url: "/vos-sync/freelancer/profile",
    });

    return NextResponse.json({
      success: true,
      message: "Profile view logged.",
    });
  } catch (err: unknown) {
    console.error("POST /api/freelancer/profile-views error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
