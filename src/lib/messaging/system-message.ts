// src/lib/messaging/system-message.ts

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

export interface CreateSystemMessageParams {
  clientId: number;
  freelancerId: number;
  jobId?: number | null;
  text: string;
  senderId?: number;
}

/**
 * Creates or retrieves a conversation between clientId and freelancerId,
 * then posts a SYSTEM message into vs_message and updates vs_conversation.last_message_at.
 */
export async function createSystemMessage({
  clientId,
  freelancerId,
  jobId,
  text,
  senderId,
}: CreateSystemMessageParams): Promise<void> {
  if (!DIRECTUS_BASE) return;

  try {
    const nowISO = new Date().toISOString().slice(0, 19).replace("T", " ");

    // 1. Check existing conversation
    let filter = `filter[client_id][_eq]=${clientId}&filter[freelancer_id][_eq]=${freelancerId}&filter[status][_neq]=BLOCKED`;
    if (jobId) {
      filter += `&filter[job_id][_eq]=${jobId}`;
    }

    const checkRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation?${filter}&limit=1&fields=conversation_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    let conversationId: number | null = null;

    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      conversationId = checkJson.data?.[0]?.conversation_id ?? null;
    }

    // 2. Create conversation if it doesn't exist
    if (!conversationId) {
      const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_conversation`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          client_id: clientId,
          freelancer_id: freelancerId,
          job_id: jobId ?? null,
          conversation_type: jobId ? "JOB_APPLICATION" : "DIRECT_MESSAGE",
          status: "ACTIVE",
          archived_by_client: false,
          archived_by_freelancer: false,
          last_message_at: nowISO,
        }),
      });

      if (createRes.ok) {
        const createJson = await createRes.json();
        conversationId = createJson.data?.conversation_id ?? null;
      }
    }

    if (!conversationId) return;

    // 3. Insert SYSTEM message into vs_message
    const effectiveSenderId = senderId ?? clientId;

    await fetch(`${DIRECTUS_BASE}/items/vs_message`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: effectiveSenderId,
        message_type: "SYSTEM",
        message_content: text,
        is_edited: false,
        is_deleted: false,
      }),
    });

    // 4. Update vs_conversation last_message_at
    await fetch(`${DIRECTUS_BASE}/items/vs_conversation/${conversationId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ last_message_at: nowISO }),
    });
  } catch (err) {
    console.error("Error creating system message:", err);
  }
}
