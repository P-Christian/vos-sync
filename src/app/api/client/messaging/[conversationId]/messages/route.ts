// src/app/api/client/messaging/[conversationId]/messages/route.ts

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

// ─── GET — Fetch messages in a conversation ────────────────────────────────

export async function GET(
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

    // Verify client belongs to this conversation
    const convRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation?filter[conversation_id][_eq]=${conversationId}&fields=conversation_id,client_id,freelancer_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convRes.ok) {
      const errText = await convRes.text();
      console.error("Directus client conversation lookup error:", errText);
      return NextResponse.json(
        { error: "Failed to fetch conversation details." },
        { status: convRes.status }
      );
    }

    const convJson = await convRes.json();
    const conv = Array.isArray(convJson.data) ? convJson.data[0] : convJson.data;

    if (!conv) {
      return NextResponse.json(
        { error: `Conversation #${conversationId} not found.` },
        { status: 404 }
      );
    }

    if (conv.client_id !== userId && conv.freelancer_id !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Fetch messages
    const msgsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_eq]=${conversationId}&filter[is_deleted][_eq]=false&sort[]=created_at&limit=${limit}&offset=${offset}&fields=message_id,conversation_id,sender_id,message_type,message_content,is_edited,edited_at,created_at,is_deleted`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!msgsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch messages." },
        { status: msgsRes.status }
      );
    }

    const msgsJson = await msgsRes.json();
    const messages: Record<string, unknown>[] = msgsJson.data ?? [];

    // Fetch attachments for these messages
    const messageIds = messages.map((m) => m.message_id as number);
    const attachmentsMap = new Map<number, Record<string, unknown>[]>();

    if (messageIds.length > 0) {
      const attachRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_message_attachment?filter[message_id][_in]=${messageIds.join(",")}&fields=attachment_id,message_id,file_name,file_path,file_size,mime_type,created_at&limit=500`,
        { headers: getHeaders(), cache: "no-store" }
      );

      if (attachRes.ok) {
        const attachJson = await attachRes.json();
        for (const att of (attachJson.data ?? []) as Record<
          string,
          unknown
        >[]) {
          const mid = att.message_id as number;
          if (!attachmentsMap.has(mid)) attachmentsMap.set(mid, []);
          attachmentsMap.get(mid)!.push(att);
        }
      }

      // Mark messages as read (fire-and-forget) for messages not sent by this user
      const unreadIds = messages
        .filter((m) => (m.sender_id as number) !== userId)
        .map((m) => m.message_id as number);

      if (unreadIds.length > 0) {
        // Check which are already read
        const readRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_message_read?filter[message_id][_in]=${unreadIds.join(",")}&filter[user_id][_eq]=${userId}&fields=message_id`,
          { headers: getHeaders(), cache: "no-store" }
        )
          .then((r) => r.json())
          .then((j) => j.data ?? []);

        const alreadyReadIds = new Set(
          (readRes as Record<string, unknown>[]).map((r) => r.message_id as number)
        );

        const toMarkIds = unreadIds.filter((id) => !alreadyReadIds.has(id));

        if (toMarkIds.length > 0) {
          const nowISO = new Date().toISOString().slice(0, 19).replace("T", " ");
          const readPayloads = toMarkIds.map((mid) => ({
            message_id: mid,
            user_id: userId,
            read_at: nowISO,
          }));

          fetch(`${DIRECTUS_BASE}/items/vs_message_read`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(readPayloads),
          }).catch((e) => console.error("Mark read error:", e));
        }
      }
    }

    // Batch-fetch vs_system_message for SYSTEM-type messages
    const systemMsgIds = messages
      .filter((m) => m.message_type === "SYSTEM")
      .map((m) => m.message_id as number);

    const systemMsgMap: Record<number, Record<string, unknown>> = {};
    const cardDataMap: Record<number, Record<string, unknown>> = {};

    if (systemMsgIds.length > 0) {
      const smRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_system_message?filter[message_id][_in]=${systemMsgIds.join(",")}&fields=system_message_id,message_id,event_type,application_id,interview_id&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (smRes.ok) {
        const smJson = await smRes.json();
        const smList = (smJson.data ?? []) as Record<string, unknown>[];
        for (const sm of smList) {
          systemMsgMap[sm.message_id as number] = sm;
        }

        // Collect application_ids and interview_ids
        const appIds = Array.from(new Set(smList.map((s) => s.application_id).filter(Boolean))) as number[];
        const ivIds = Array.from(new Set(smList.map((s) => s.interview_id).filter(Boolean))) as number[];

        const [appsRes, ivsRes] = await Promise.all([
          appIds.length > 0
            ? fetch(`${DIRECTUS_BASE}/items/vs_job_application?filter[application_id][_in]=${appIds.join(",")}&fields=*`, { headers: getHeaders(), cache: "no-store" })
                .then((r) => r.json())
                .then((j) => j.data ?? [])
            : Promise.resolve([]),
          ivIds.length > 0
            ? fetch(`${DIRECTUS_BASE}/items/vs_interview?filter[interview_id][_in]=${ivIds.join(",")}&fields=*`, { headers: getHeaders(), cache: "no-store" })
                .then((r) => r.json())
                .then((j) => j.data ?? [])
            : Promise.resolve([]),
        ]);

        const appMap = new Map<number, Record<string, unknown>>(appsRes.map((a: Record<string, unknown>) => [a.application_id as number, a]));
        const ivMap = new Map<number, Record<string, unknown>>(ivsRes.map((i: Record<string, unknown>) => [i.interview_id as number, i]));

        // Collect user_ids and job_ids for application cards
        const userIds = Array.from(new Set(appsRes.map((a: Record<string, unknown>) => a.user_id).filter(Boolean))) as number[];
        const jobIds = Array.from(new Set(appsRes.map((a: Record<string, unknown>) => a.job_id).filter(Boolean))) as number[];

        const [usersRes, jobsRes] = await Promise.all([
          userIds.length > 0
            ? fetch(`${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_contact,profile_image_url`, { headers: getHeaders(), cache: "no-store" })
                .then((r) => r.json())
                .then((j) => j.data ?? [])
            : Promise.resolve([]),
          jobIds.length > 0
            ? fetch(`${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title,salary_min,salary_max`, { headers: getHeaders(), cache: "no-store" })
                .then((r) => r.json())
                .then((j) => j.data ?? [])
            : Promise.resolve([]),
        ]);

        const userMap = new Map<number, Record<string, unknown>>(usersRes.map((u: Record<string, unknown>) => [u.user_id as number, u]));
        const jobMap = new Map<number, Record<string, unknown>>(jobsRes.map((j: Record<string, unknown>) => [j.job_id as number, j]));

        for (const sm of smList) {
          const mid = sm.message_id as number;
          const et = sm.event_type as string;
          if (et === "APPLICATION_SUBMITTED" || et === "APPLICATION_STATUS_CHANGED" || et === "HIRED") {
            const app = appMap.get(sm.application_id as number);
            if (app) {
              const u = userMap.get(app.user_id as number);
              const j = jobMap.get(app.job_id as number);
              cardDataMap[mid] = {
                event_type: et,
                application_id: app.application_id,
                application_status: app.application_status ?? "APPLIED",
                applied_at: app.applied_at ?? null,
                expected_salary: app.expected_salary ?? null,
                cover_letter: app.cover_letter ?? null,
                portfolio_url: app.portfolio_url ?? null,
                applicant_name: u ? `${u.user_fname ?? ""} ${u.user_lname ?? ""}`.trim() : "Unknown",
                applicant_avatar: u?.profile_image_url ? `/api/client/assets/${(u.profile_image_url as string).split("/").pop()}` : null,
                applicant_email: (u?.user_email as string) ?? null,
                applicant_phone: (u?.user_contact as string) ?? null,
                job_title: (j?.job_title as string) ?? "Position",
                salary_min: (j?.salary_min as number) ?? null,
                salary_max: (j?.salary_max as number) ?? null,
              };
            }
          } else if (et === "INTERVIEW_SCHEDULED" || et === "INTERVIEW_UPDATED") {
            const iv = ivMap.get(sm.interview_id as number);
            if (iv) {
              cardDataMap[mid] = {
                event_type: et,
                interview_id: iv.interview_id,
                scheduled_at: iv.scheduled_at ?? null,
                duration_minutes: iv.duration_minutes ?? 60,
                timezone: iv.timezone ?? "Asia/Manila",
                interview_format: iv.interview_format ?? "ONLINE",
                meeting_link: iv.meeting_link ?? null,
                meeting_location: iv.meeting_location ?? null,
                interview_status: iv.interview_status ?? null,
              };
            }
          }
        }
      }
    }

    // Enrich messages with attachments, system_message, and system_card_data
    const enriched = messages.map((msg) => ({
      ...msg,
      attachments: attachmentsMap.get(msg.message_id as number) ?? [],
      system_message: systemMsgMap[msg.message_id as number] ?? null,
      system_card_data: cardDataMap[msg.message_id as number] ?? null,
    }));

    return NextResponse.json({ messages: enriched });
  } catch (err: unknown) {
    console.error("GET /api/client/messaging/[id]/messages error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST — Send a message ─────────────────────────────────────────────────

export async function POST(
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

    if (!body?.message_content && !body?.attachments?.length) {
      return NextResponse.json(
        { error: "message_content or attachments required." },
        { status: 400 }
      );
    }

    // Verify access
    const convRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation?filter[conversation_id][_eq]=${conversationId}&fields=conversation_id,client_id,freelancer_id,status`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convRes.ok) {
      const errText = await convRes.text();
      console.error("Directus client conversation lookup error (POST):", errText);
      return NextResponse.json(
        { error: "Failed to fetch conversation details." },
        { status: convRes.status }
      );
    }

    const convJson = await convRes.json();
    const conv = Array.isArray(convJson.data) ? convJson.data[0] : convJson.data;

    if (!conv) {
      return NextResponse.json(
        { error: `Conversation #${conversationId} not found.` },
        { status: 404 }
      );
    }

    if (conv.client_id !== userId && conv.freelancer_id !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (conv.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Conversation is blocked." },
        { status: 403 }
      );
    }

    const nowISO = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Insert message
    const msgRes = await fetch(`${DIRECTUS_BASE}/items/vs_message`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        conversation_id: Number(conversationId),
        sender_id: userId,
        message_type: body.message_type ?? "TEXT",
        message_content: body.message_content ?? null,
        is_edited: false,
        is_deleted: false,
      }),
    });

    const msgJson = await msgRes.json();

    if (!msgRes.ok) {
      return NextResponse.json(
        {
          error:
            msgJson.errors?.[0]?.message ?? "Failed to send message.",
        },
        { status: msgRes.status }
      );
    }

    const newMessage = msgJson.data;

    // Insert attachments if any
    let attachments: unknown[] = [];
    if (body.attachments?.length && newMessage?.message_id) {
      const attPayloads = body.attachments.map(
        (a: Record<string, unknown>) => ({
          message_id: newMessage.message_id,
          file_name: a.file_name,
          file_path: a.file_path,
          file_size: a.file_size ?? null,
          mime_type: a.mime_type ?? null,
        })
      );

      const attRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_message_attachment`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(attPayloads),
        }
      );

      if (attRes.ok) {
        const attJson = await attRes.json();
        attachments = attJson.data ?? [];
      }
    }

    // Update conversation last_message_at
    fetch(`${DIRECTUS_BASE}/items/vs_conversation/${conversationId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ last_message_at: nowISO }),
    }).catch((e) => console.error("Update last_message_at error:", e));

    return NextResponse.json(
      { message: { ...newMessage, attachments } },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/client/messaging/[id]/messages error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
