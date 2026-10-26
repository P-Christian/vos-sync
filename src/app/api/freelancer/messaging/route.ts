// src/app/api/freelancer/messaging/route.ts

import { NextRequest, NextResponse } from "next/server";
import { safeDecryptMessage } from "@/lib/message-encryption";
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

function formatAvatarUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // Already proxied — use as-is
  if (trimmed.startsWith("/api/freelancer/assets/")) return trimmed;

  // data: URI — use as-is
  if (trimmed.startsWith("data:")) return trimmed;

  // Full Directus URL (https://directus.host/assets/UUID) — extract UUID and proxy it
  const assetsMatch = trimmed.match(/\/assets\/([^/?#]+)/);
  if (assetsMatch?.[1]) return `/api/freelancer/assets/${assetsMatch[1]}`;

  // Bare UUID or path segment — use last segment
  const parts = trimmed.split("/");
  const fileId = parts[parts.length - 1];
  return fileId ? `/api/freelancer/assets/${fileId}` : null;
}

// ─── GET — List conversations for the authenticated freelancer ─────────────

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session || !isFreelancerSession(session)) {
      return NextResponse.json(
        { error: session ? "Forbidden: Freelancer access required." : "Unauthorized." },
        { status: session ? 403 : 401 }
      );
    }

    const userId = Number(session.userId);

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "true";

    // Mutually exclusive archive mode: archived-only vs active-only
    let filter = `filter[freelancer_id][_eq]=${userId}&filter[status][_neq]=BLOCKED`;
    if (includeArchived) {
      filter += `&filter[archived_by_freelancer][_eq]=true`;
    } else {
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

    const [usersData, jobsData, companyUsersData] = await Promise.all([
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
            `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title,company_id&limit=${jobIds.length}`,
            { headers: getHeaders(), cache: "no-store" }
          )
            .then((r) => r.json())
            .then((j) => j.data ?? [])
        : Promise.resolve([]),
      clientIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_in]=${clientIds.join(",")}&fields=user_id,company_id&limit=${clientIds.length * 2}`,
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

    const clientCompanyMap = new Map<number, number>(
      (companyUsersData as Record<string, unknown>[]).map((cu) => [
        cu.user_id as number,
        cu.company_id as number,
      ])
    );

    const rawCompanyIds: number[] = [];
    for (const j of jobsData as Record<string, unknown>[]) {
      const cId =
        typeof j.company_id === "object"
          ? (j.company_id as { company_id?: number })?.company_id
          : j.company_id;
      if (typeof cId === "number") rawCompanyIds.push(cId);
    }
    for (const cu of companyUsersData as Record<string, unknown>[]) {
      if (typeof cu.company_id === "number") rawCompanyIds.push(cu.company_id);
    }
    const uniqueCompanyIds = Array.from(new Set(rawCompanyIds));

    const conversationIds = conversations.map(
      (c: Record<string, unknown>) => c.conversation_id as number
    );

    const lastMessagesMap = new Map<number, Record<string, unknown>>();
    const unreadMap = new Map<number, number>();

    const [companiesData, lastMsgRes, unreadRes] = await Promise.all([
      uniqueCompanyIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${uniqueCompanyIds.join(",")}&fields=company_id,company_name,company_logo&limit=${uniqueCompanyIds.length}`,
            { headers: getHeaders(), cache: "no-store" }
          )
            .then((r) => r.json())
            .then((j) => j.data ?? [])
        : Promise.resolve([]),
      conversationIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_in]=${conversationIds.join(",")}&filter[is_deleted][_eq]=false&sort[]=-created_at&limit=200&fields=message_id,conversation_id,message_type,message_content,sender_id,created_at`,
            { headers: getHeaders(), cache: "no-store" }
          )
            .then((r) => r.json())
            .then((j) => j.data ?? [])
        : Promise.resolve([]),
      conversationIds.length > 0
        ? fetch(
            `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_in]=${conversationIds.join(",")}&filter[is_deleted][_eq]=false&fields=message_id,conversation_id,sender_id&limit=1000`,
            { headers: getHeaders(), cache: "no-store" }
          )
            .then((r) => r.json())
            .then((j) => j.data ?? [])
        : Promise.resolve([]),
    ]);

    const companyMap = new Map<
      number,
      { company_name: string; company_logo: string | null }
    >(
      (companiesData as Record<string, unknown>[]).map((c) => [
        c.company_id as number,
        {
          company_name: (c.company_name as string) || "Unknown Company",
          company_logo: (c.company_logo as string) || null,
        },
      ])
    );

    if (conversationIds.length > 0) {
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

      // Resolve company via job.company_id first, then fallback to vs_company_user
      const jobCompanyId =
        typeof job?.company_id === "object"
          ? (job.company_id as { company_id?: number })?.company_id
          : typeof job?.company_id === "number"
          ? job.company_id
          : undefined;
      const clientCompanyId = clientCompanyMap.get(conv.client_id as number);
      const resolvedCompanyId = jobCompanyId ?? clientCompanyId;
      const company = resolvedCompanyId ? companyMap.get(resolvedCompanyId) : undefined;

      const clientFullName = client
        ? `${client.user_fname ?? ""} ${client.user_lname ?? ""}`.trim()
        : "";
      const otherPartyName = clientFullName || company?.company_name || "Unknown Employer";
      const otherPartyPrefix = client?.user_fname || company?.company_name || otherPartyName.split(" ")[0] || "Employer";

      let lastMessagePreview = "";
      if (lastMsg) {
        const isOwn = (lastMsg.sender_id as number) === userId;
        const senderPrefix = isOwn ? "You" : otherPartyPrefix;

        if (lastMsg.message_type === "SYSTEM") {
          const rawContent = (lastMsg.message_content as string) ?? "";
          const lower = rawContent.toLowerCase();
          if (lower.includes("hired") || lower.includes("client hired")) {
            lastMessagePreview = "You were hired!";
          } else if (lower.includes("application submitted")) {
            lastMessagePreview = "Application submitted";
          } else if (lower.includes("status changed") || lower.includes("application updated")) {
            lastMessagePreview = "Application status updated";
          } else if (lower.includes("interview scheduled")) {
            lastMessagePreview = "Interview scheduled";
          } else if (lower.includes("interview rescheduled") || lower.includes("interview updated")) {
            lastMessagePreview = "Interview rescheduled";
          } else {
            lastMessagePreview = rawContent;
          }
        } else if (lastMsg.message_type === "TEXT") {
          const rawContent = (lastMsg.message_content as string) ?? "";
          const content = safeDecryptMessage(rawContent) ?? "";
          const fullText = `${senderPrefix}: ${content}`;
          lastMessagePreview =
            fullText.length > 60 ? fullText.slice(0, 60) + "…" : fullText;
        } else if (lastMsg.message_type === "IMAGE") {
          lastMessagePreview = `${senderPrefix}: 📷 Image`;
        } else if (lastMsg.message_type === "FILE") {
          lastMessagePreview = `${senderPrefix}: 📎 File`;
        }
      }

      const avatarRaw =
        (client?.profile_image_url as string) ||
        (company?.company_logo as string) ||
        null;

      return {
        ...conv,
        other_party_name: otherPartyName,
        company_name: company?.company_name ?? null,
        other_party_avatar: formatAvatarUrl(avatarRaw),
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
