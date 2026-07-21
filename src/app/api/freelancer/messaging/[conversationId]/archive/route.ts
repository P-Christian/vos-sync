// src/app/api/freelancer/messaging/[conversationId]/archive/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
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

// ─── PATCH — Archive / Unarchive conversation (freelancer-side only) ────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

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

    const body = await req.json().catch(() => null);
    const archive: boolean = body?.archive ?? true;

    const convRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation/${conversationId}?fields=conversation_id,freelancer_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convRes.ok) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const convJson = await convRes.json();
    const conv = convJson.data;

    if (conv.freelancer_id !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const nowISO = new Date().toISOString().slice(0, 19).replace("T", " ");

    const patchRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation/${conversationId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          archived_by_freelancer: archive,
          archived_at: archive ? nowISO : null,
        }),
      }
    );

    if (!patchRes.ok) {
      const text = await patchRes.text();
      console.error("Archive patch error:", text);
      return NextResponse.json(
        { error: "Failed to update conversation." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({ success: true, archived: archive });
  } catch (err: unknown) {
    console.error(
      "PATCH /api/freelancer/messaging/[id]/archive error:",
      err
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
