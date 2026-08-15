import { NextRequest, NextResponse } from "next/server";
import { getPHTimeString } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "🙏", "❓"] as const;

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

interface DirectusReaction {
  reaction_id: number;
  message_id: number;
  user_id: number;
  reaction: string;
  created_at: string;
}

interface DirectusUser {
  user_id: number;
  user_fname?: string | null;
  user_lname?: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const numMessageId = Number(messageId);
    if (!numMessageId || isNaN(numMessageId)) {
      return NextResponse.json({ error: "Invalid message ID." }, { status: 400 });
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

    const body = await req.json().catch(() => null);
    const reaction = body?.reaction;

    if (!reaction || typeof reaction !== "string" || !ALLOWED_REACTIONS.includes(reaction as (typeof ALLOWED_REACTIONS)[number])) {
      return NextResponse.json(
        { error: `Invalid reaction. Allowed: ${ALLOWED_REACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // 1. Fetch message and verify conversation ownership
    const msgRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_message/${numMessageId}?fields=message_id,conversation_id,is_deleted`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!msgRes.ok) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const msgJson = await msgRes.json();
    const message = msgJson.data;

    if (!message || message.is_deleted) {
      return NextResponse.json({ error: "Message not found or deleted." }, { status: 404 });
    }

    const convRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation/${message.conversation_id}?fields=conversation_id,client_id,freelancer_id,status`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convRes.ok) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const convJson = await convRes.json();
    const conv = convJson.data;

    if (!conv || (conv.client_id !== userId && conv.freelancer_id !== userId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (conv.status === "BLOCKED") {
      return NextResponse.json({ error: "Conversation is blocked." }, { status: 403 });
    }

    // 2. Check all reactions by this user on this message
    const userReactionsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_message_reaction?filter[message_id][_eq]=${numMessageId}&filter[user_id][_eq]=${userId}&fields=reaction_id,reaction`,
      { headers: getHeaders(), cache: "no-store" }
    );

    let userReactions: { reaction_id: number; reaction: string }[] = [];
    if (userReactionsRes.ok) {
      const j = await userReactionsRes.json();
      userReactions = j.data ?? [];
    }

    const sameReaction = userReactions.find((r) => r.reaction === reaction);

    // Delete any existing reactions by this user on this message (ensures single reaction per user)
    for (const item of userReactions) {
      await fetch(`${DIRECTUS_BASE}/items/vs_message_reaction/${item.reaction_id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    }

    // If user did not have the exact same reaction previously, insert the new one (toggle ON / switch emoji)
    if (!sameReaction) {
      const nowPH = getPHTimeString();
      await fetch(`${DIRECTUS_BASE}/items/vs_message_reaction`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          message_id: numMessageId,
          user_id: userId,
          reaction,
          created_at: nowPH,
        }),
      });
    }

    // 3. Fetch all current reactions for this message
    const allReactionsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_message_reaction?filter[message_id][_eq]=${numMessageId}&fields=reaction_id,message_id,user_id,reaction,created_at&sort[]=created_at&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );

    const allReactions: DirectusReaction[] = allReactionsRes.ok
      ? (await allReactionsRes.json()).data ?? []
      : [];

    const userIds = Array.from(new Set(allReactions.map((r) => r.user_id)));
    const usersMap = new Map<number, string>();

    if (userIds.length > 0) {
      const usersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname&limit=100`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (usersRes.ok) {
        const uList: DirectusUser[] = (await usersRes.json()).data ?? [];
        for (const u of uList) {
          const name = `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.trim() || "User";
          usersMap.set(u.user_id, name);
        }
      }
    }

    // 4. Group reactions by emoji
    const groupedMap = new Map<
      string,
      { reaction: string; count: number; users: { user_id: number; user_name: string }[]; reacted_by_me: boolean }
    >();

    for (const r of allReactions) {
      if (!groupedMap.has(r.reaction)) {
        groupedMap.set(r.reaction, {
          reaction: r.reaction,
          count: 0,
          users: [],
          reacted_by_me: false,
        });
      }
      const g = groupedMap.get(r.reaction)!;
      g.count += 1;
      g.users.push({
        user_id: r.user_id,
        user_name: usersMap.get(r.user_id) || "User",
      });
      if (r.user_id === userId) {
        g.reacted_by_me = true;
      }
    }

    return NextResponse.json({
      message_id: numMessageId,
      reactions: Array.from(groupedMap.values()),
    });
  } catch (err: unknown) {
    console.error("POST /api/shared/messaging/messages/[messageId]/reactions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
