import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isFreelancerSession } from "@/lib/authenticated-session";

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

// ─── PATCH — Archive / Unarchive conversation (freelancer-side only) ────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isFreelancerSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: freelancer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Expected { "archive": boolean }.' },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const archiveValue: unknown =
      typeof body === "object" && body !== null && "archive" in body
        ? (body as { archive?: unknown }).archive
        : undefined;

    if (typeof archiveValue !== "boolean") {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { "archive": boolean }.' },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const archive: boolean = archiveValue;

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
