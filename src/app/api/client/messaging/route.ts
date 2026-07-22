// src/app/api/client/messaging/route.ts

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
  if (trimmed.startsWith("/api/client/assets/")) {
    return trimmed;
  }
  const parts = trimmed.split("/");
  const fileId = parts[parts.length - 1];
  return `/api/client/assets/${fileId}`;
}

// ─── GET — List conversations for the authenticated client ─────────────────

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

    // Build filter
    let filter = `filter[client_id][_eq]=${userId}&filter[status][_neq]=BLOCKED`;
    if (!includeArchived) {
      filter += `&filter[archived_by_client][_eq]=false`;
    }

    // Fetch conversations with user join for freelancer name
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

    // Collect freelancer user IDs and job IDs for enrichment
    const freelancerIds: number[] = Array.from(
      new Set(
        conversations
          .map((c: Record<string, unknown>) => c.freelancer_id)
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

    // Fetch freelancer user info in parallel
    const [usersData, jobsData] = await Promise.all([
      freelancerIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${freelancerIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,profile_image_url&limit=${freelancerIds.length}`,
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

    // Build lookup maps
    const userMap = new Map<number, Record<string, unknown>>(
      usersData.map((u: Record<string, unknown>) => [u.user_id as number, u])
    );
    const jobMap = new Map<number, Record<string, unknown>>(
      jobsData.map((j: Record<string, unknown>) => [j.job_id as number, j])
    );

    // Fetch last messages and unread counts
    const conversationIds = conversations.map(
      (c: Record<string, unknown>) => c.conversation_id as number
    );

    const lastMessagesMap = new Map<number, Record<string, unknown>>();
    const unreadMap = new Map<number, number>();

    if (conversationIds.length > 0) {
      // Get last message per conversation
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

      // Build last message map (first result per conversation since sorted desc)
      for (const msg of lastMsgRes as Record<string, unknown>[]) {
        const cid = msg.conversation_id as number;
        if (!lastMessagesMap.has(cid)) {
          lastMessagesMap.set(cid, msg);
        }
      }

      // Build unread map — check vs_message_read for messages not sent by client
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

        // Count unread per conversation
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

    // Enrich conversations
    const enriched = conversations.map((conv: Record<string, unknown>) => {
      const cid = conv.conversation_id as number;
      const freelancer = userMap.get(conv.freelancer_id as number);
      const job = jobMap.get(conv.job_id as number);
      const lastMsg = lastMessagesMap.get(cid);

      const otherPartyName =
        freelancer
          ? `${freelancer.user_fname ?? ""} ${freelancer.user_lname ?? ""}`.trim()
          : "Unknown";

      let lastMessagePreview = "";
      if (lastMsg) {
        if (lastMsg.message_type === "SYSTEM") {
          lastMessagePreview = lastMsg.message_content as string ?? "";
        } else if (lastMsg.message_type === "TEXT") {
          const content = lastMsg.message_content as string ?? "";
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
        other_party_avatar: formatAvatarUrl(freelancer?.profile_image_url as string),
        other_party_email: (freelancer?.user_email as string) ?? null,
        job_title: (job?.job_title as string) ?? null,
        unread_count: unreadMap.get(cid) ?? 0,
        last_message_preview: lastMessagePreview,
        last_message_at:
          lastMsg?.created_at ?? conv.last_message_at ?? conv.created_at,
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (err: unknown) {
    console.error("GET /api/client/messaging error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST — Create a new conversation ─────────────────────────────────────

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => null);

    if (!body?.freelancer_id) {
      return NextResponse.json(
        { error: "freelancer_id is required." },
        { status: 400 }
      );
    }

    const { freelancer_id, job_id, conversation_type } = body;

    // Check if a conversation already exists between client and freelancer (for same job)
    let existingFilter = `filter[client_id][_eq]=${userId}&filter[freelancer_id][_eq]=${freelancer_id}&filter[status][_neq]=BLOCKED`;
    if (job_id) {
      existingFilter += `&filter[job_id][_eq]=${job_id}`;
    }

    const existingRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation?${existingFilter}&limit=1&fields=conversation_id,job_id,client_id,freelancer_id,conversation_type,status,last_message_at,created_at,updated_at,archived_by_client,archived_by_freelancer,archived_at`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (existingRes.ok) {
      const existingJson = await existingRes.json();
      const existing = existingJson.data?.[0];
      if (existing) {
        // If archived by client, un-archive it
        if (existing.archived_by_client) {
          await fetch(
            `${DIRECTUS_BASE}/items/vs_conversation/${existing.conversation_id}`,
            {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ archived_by_client: false }),
            }
          );
          existing.archived_by_client = false;
        }
        return NextResponse.json({ conversation: existing, created: false });
      }
    }

    // Create new conversation
    const nowISO = new Date().toISOString().slice(0, 19).replace("T", " ");
    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_conversation`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        client_id: userId,
        freelancer_id,
        job_id: job_id ?? null,
        conversation_type: conversation_type ?? "JOB_APPLICATION",
        status: "ACTIVE",
        archived_by_client: false,
        archived_by_freelancer: false,
        last_message_at: nowISO,
      }),
    });

    const createJson = await createRes.json();

    if (!createRes.ok) {
      return NextResponse.json(
        {
          error:
            createJson.errors?.[0]?.message ??
            "Failed to create conversation.",
        },
        { status: createRes.status }
      );
    }

    return NextResponse.json(
      { conversation: createJson.data, created: true },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/client/messaging error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
