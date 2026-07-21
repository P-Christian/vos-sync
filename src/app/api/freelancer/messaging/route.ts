// src/app/api/freelancer/messaging/route.ts

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

function formatAvatarUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/freelancer/assets/")) {
    return trimmed;
  }
  const parts = trimmed.split("/");
  const fileId = parts[parts.length - 1];
  return `/api/freelancer/assets/${fileId}`;
}

// ─── GET — List conversations for the authenticated freelancer ─────────────

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
    const includeArchived = searchParams.get("archived") === "true";

    let filter = `filter[freelancer_id][_eq]=${userId}&filter[status][_neq]=BLOCKED`;
    if (!includeArchived) {
      filter += `&filter[archived_by_freelancer][_eq]=false`;
    }

    const convsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation?${filter}&sort[]=-last_message_at&limit=100&fields=conversation_id,job_id,client_id,freelancer_id,conversation_type,status,last_message_at,created_at,updated_at,archived_by_client,archived_by_freelancer,archived_at`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convsRes.ok) {
      const text = await convsRes.text();
      console.error("Directus conversations fetch error:", text);
      return NextResponse.json(
        { error: "Failed to fetch conversations." },
        { status: convsRes.status }
      );
    }

    const convsJson = await convsRes.json();
    const conversations = convsJson.data ?? [];

    // Collect client user IDs and job IDs
    const clientIds: number[] = Array.from(
      new Set(
        conversations
          .map((c: Record<string, unknown>) => c.client_id)
          .filter((id: unknown): id is number => typeof id === "number")
      )
    );
    const jobIds: number[] = Array.from(
      new Set(
        conversations
          .map((c: Record<string, unknown>) => c.job_id)
          .filter((id: unknown): id is number => typeof id === "number")
      )
    );

    const [usersData, jobsData] = await Promise.all([
      clientIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${clientIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,profile_image_url&limit=${clientIds.length}`,
            { headers: getHeaders(), cache: "no-store" }
          )
            .then((r) => r.json())
            .then((j) => j.data ?? [])
        : Promise.resolve([]),
      jobIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title&limit=${jobIds.length}`,
            { headers: getHeaders(), cache: "no-store" }
          )
            .then((r) => r.json())
            .then((j) => j.data ?? [])
        : Promise.resolve([]),
    ]);

    const userMap = new Map<number, Record<string, unknown>>(
      usersData.map((u: Record<string, unknown>) => [u.user_id as number, u])
    );
    const jobMap = new Map<number, Record<string, unknown>>(
      jobsData.map((j: Record<string, unknown>) => [j.job_id as number, j])
    );

    const conversationIds = conversations.map(
      (c: Record<string, unknown>) => c.conversation_id as number
    );

    const lastMessagesMap = new Map<number, Record<string, unknown>>();
    const unreadMap = new Map<number, number>();

    if (conversationIds.length > 0) {
      const [lastMsgRes, unreadRes] = await Promise.all([
        fetch(
          `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_in]=${conversationIds.join(",")}&filter[is_deleted][_eq]=false&sort[]=-created_at&limit=200&fields=message_id,conversation_id,message_type,message_content,sender_id,created_at`,
          { headers: getHeaders(), cache: "no-store" }
        )
          .then((r) => r.json())
          .then((j) => j.data ?? []),
        fetch(
          `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_in]=${conversationIds.join(",")}&filter[is_deleted][_eq]=false&fields=message_id,conversation_id,sender_id`,
          { headers: getHeaders(), cache: "no-store" }
        )
          .then((r) => r.json())
          .then((j) => j.data ?? []),
      ]);

      for (const msg of lastMsgRes as Record<string, unknown>[]) {
        const cid = msg.conversation_id as number;
        if (!lastMessagesMap.has(cid)) {
          lastMessagesMap.set(cid, msg);
        }
      }

      const allMessageIds = (unreadRes as Record<string, unknown>[])
        .filter((m) => (m.sender_id as number) !== userId)
        .map((m) => m.message_id as number);

      if (allMessageIds.length > 0) {
        const readRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_message_read?filter[message_id][_in]=${allMessageIds.join(",")}&filter[user_id][_eq]=${userId}&fields=message_id&limit=1000`,
          { headers: getHeaders(), cache: "no-store" }
        )
          .then((r) => r.json())
          .then((j) => j.data ?? []);

        const readIds = new Set(
          (readRes as Record<string, unknown>[]).map(
            (r) => r.message_id as number
          )
        );

        for (const msg of unreadRes as Record<string, unknown>[]) {
          if (
            (msg.sender_id as number) !== userId &&
            !readIds.has(msg.message_id as number)
          ) {
            const cid = msg.conversation_id as number;
            unreadMap.set(cid, (unreadMap.get(cid) ?? 0) + 1);
          }
        }
      }
    }

    const enriched = conversations.map((conv: Record<string, unknown>) => {
      const cid = conv.conversation_id as number;
      const client = userMap.get(conv.client_id as number);
      const job = jobMap.get(conv.job_id as number);
      const lastMsg = lastMessagesMap.get(cid);

      const otherPartyName = client
        ? `${client.user_fname ?? ""} ${client.user_lname ?? ""}`.trim()
        : "Unknown Employer";

      let lastMessagePreview = "";
      if (lastMsg) {
        if (lastMsg.message_type === "SYSTEM") {
          lastMessagePreview = (lastMsg.message_content as string) ?? "";
        } else if (lastMsg.message_type === "TEXT") {
          const content = (lastMsg.message_content as string) ?? "";
          lastMessagePreview =
            content.length > 60 ? content.slice(0, 60) + "…" : content;
        } else if (lastMsg.message_type === "IMAGE") {
          lastMessagePreview = "📷 Image";
        } else if (lastMsg.message_type === "FILE") {
          lastMessagePreview = "📎 File";
        }
      }

      return {
        ...conv,
        other_party_name: otherPartyName,
        other_party_avatar: formatAvatarUrl(client?.profile_image_url as string),
        other_party_email: (client?.user_email as string) ?? null,
        job_title: (job?.job_title as string) ?? null,
        unread_count: unreadMap.get(cid) ?? 0,
        last_message_preview: lastMessagePreview,
        last_message_at:
          lastMsg?.created_at ?? conv.last_message_at ?? conv.created_at,
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (err: unknown) {
    console.error("GET /api/freelancer/messaging error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
