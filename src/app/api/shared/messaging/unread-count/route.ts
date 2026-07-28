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
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ unreadCount: 0 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ unreadCount: 0 });

    // Fetch conversations where user is client or freelancer
    const convUrl = `${DIRECTUS_BASE}/items/vs_conversation?filter[_or][0][freelancer_id][_eq]=${userId}&filter[_or][1][client_id][_eq]=${userId}&fields=conversation_id,client_id,freelancer_id,archived_by_client,archived_by_freelancer`;
    const convRes = await fetch(convUrl, { headers: getHeaders(), cache: "no-store" });
    if (!convRes.ok) return NextResponse.json({ unreadCount: 0 });

    const convJson = await convRes.json();
    const conversations = convJson.data || [];

    // Filter out conversations that are archived by this user
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const activeConversations = conversations.filter((c: any) => {
      if (c.freelancer_id === userId && c.archived_by_freelancer) return false;
      if (c.client_id === userId && c.archived_by_client) return false;
      return true;
    });

    const conversationIds = activeConversations.map((c: any) => c.conversation_id);
    if (conversationIds.length === 0) {
      return NextResponse.json({ unreadCount: 0 });
    }

    // Fetch all active messages in these conversations not sent by this user
    const msgUrl = `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_in]=${conversationIds.join(",")}&filter[is_deleted][_eq]=false&filter[sender_id][_neq]=${userId}&fields=message_id&limit=1000`;
    const msgRes = await fetch(msgUrl, { headers: getHeaders(), cache: "no-store" });
    if (!msgRes.ok) return NextResponse.json({ unreadCount: 0 });

    const msgJson = await msgRes.json();
    const messages = msgJson.data || [];
    const messageIds = messages.map((m: any) => m.message_id);

    if (messageIds.length === 0) {
      return NextResponse.json({ unreadCount: 0 });
    }

    // Fetch read confirmations for these messages by this user
    const readUrl = `${DIRECTUS_BASE}/items/vs_message_read?filter[message_id][_in]=${messageIds.join(",")}&filter[user_id][_eq]=${userId}&fields=message_id&limit=1000`;
    const readRes = await fetch(readUrl, { headers: getHeaders(), cache: "no-store" });
    if (!readRes.ok) return NextResponse.json({ unreadCount: messages.length });

    const readJson = await readRes.json();
    const readMessages = readJson.data || [];
    const readMessageIds = new Set(readMessages.map((r: any) => r.message_id));

    // Unread count is total messages minus read messages
    let unreadCount = 0;
    for (const mid of messageIds) {
      if (!readMessageIds.has(mid)) {
        unreadCount++;
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({ unreadCount });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    return NextResponse.json({ unreadCount: 0 });
  }
}
