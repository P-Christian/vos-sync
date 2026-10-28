import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { getPHTimeString } from "@/lib/utils";

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

// POST: Report an abusive/scam message or conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const msgIdNum = Number(messageId);

    const session = await authenticateRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const reporterUserId = Number(session.userId);

    const body = await req.json().catch(() => ({}));
    const { reason_code, report_details, conversation_id, reported_user_id } = body;

    // Validate reason_code against allowed enum
    const ALLOWED_REASONS = [
      "SPAM",
      "HARASSMENT",
      "INAPPROPRIATE_CONTENT",
      "FRAUD_OR_SCAM",
      "OFF_PLATFORM_PAYMENT",
      "HATE_SPEECH",
      "OTHER",
    ];
    if (!reason_code || !ALLOWED_REASONS.includes(reason_code)) {
      return NextResponse.json({ error: "A valid report reason is required." }, { status: 400 });
    }

    let targetMessageId = msgIdNum > 0 ? msgIdNum : 0;
    let targetConversationId = conversation_id ? Number(conversation_id) : 0;
    let targetReportedUserId = reported_user_id ? Number(reported_user_id) : 0;

    // If messageId is provided, query it to ensure conversation_id and reported_user_id are accurate
    if (targetMessageId > 0) {
      try {
        const msgRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_message/${targetMessageId}?fields=message_id,conversation_id,sender_id`,
          { headers: getHeaders() }
        );
        if (msgRes.ok) {
          const msgJson = await msgRes.json();
          const msgData = msgJson?.data;
          if (msgData) {
            if (!targetConversationId) targetConversationId = msgData.conversation_id;
            if (!targetReportedUserId && msgData.sender_id !== reporterUserId) {
              targetReportedUserId = msgData.sender_id;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch message for report:", e);
      }
    }

    // If reporting a conversation (messageId = 0 or missing), resolve the latest message_id
    if (!targetMessageId && targetConversationId > 0) {
      try {
        const msgRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_message?filter[conversation_id][_eq]=${targetConversationId}&sort=-message_id&limit=1&fields=message_id,sender_id`,
          { headers: getHeaders() }
        );
        if (msgRes.ok) {
          const msgJson = await msgRes.json();
          const list = msgJson?.data ?? [];
          if (list.length > 0) {
            targetMessageId = Number(list[0].message_id);
            if (!targetReportedUserId && list[0].sender_id !== reporterUserId) {
              targetReportedUserId = Number(list[0].sender_id);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch latest message in conversation for report:", e);
      }
    }

    // If reported_user_id is still unknown or identical to reporter, resolve from vs_conversation
    if ((!targetReportedUserId || targetReportedUserId === reporterUserId) && targetConversationId > 0) {
      try {
        const convRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_conversation/${targetConversationId}?fields=conversation_id,client_id,freelancer_id`,
          { headers: getHeaders() }
        );
        if (convRes.ok) {
          const convJson = await convRes.json();
          const conv = convJson?.data;
          if (conv) {
            targetReportedUserId =
              reporterUserId === Number(conv.client_id)
                ? Number(conv.freelancer_id)
                : Number(conv.client_id);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch conversation participants for report:", e);
      }
    }

    if (!targetMessageId || targetMessageId <= 0) {
      return NextResponse.json(
        { error: "Cannot submit report: no valid message found in this conversation." },
        { status: 400 }
      );
    }

    if (!targetConversationId || targetConversationId <= 0) {
      return NextResponse.json(
        { error: "Cannot submit report: invalid conversation ID." },
        { status: 400 }
      );
    }

    if (!targetReportedUserId || targetReportedUserId <= 0) {
      return NextResponse.json(
        { error: "Cannot submit report: could not resolve reported user." },
        { status: 400 }
      );
    }

    const now = getPHTimeString();

    // Prepare report payload matching vs_message_report schema
    const reportPayload: Record<string, unknown> = {
      message_id: targetMessageId,
      conversation_id: targetConversationId,
      reporter_user_id: reporterUserId,
      reported_user_id: targetReportedUserId,
      reason_code,
      report_details: report_details?.trim() || null,
      status: "PENDING",
      created_at: now,
    };

    // Post to Directus vs_message_report
    const postRes = await fetch(`${DIRECTUS_BASE}/items/vs_message_report`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(reportPayload),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      // Handle unique constraint (user already reported this message)
      if (
        errText.includes("RECORD_NOT_UNIQUE") ||
        errText.includes("Duplicate entry") ||
        errText.includes("uq_msg_report_user")
      ) {
        return NextResponse.json({
          success: true,
          message: "You have already submitted a report for this conversation or message.",
        });
      }
      console.error("Directus vs_message_report insert failed:", errText);
      return NextResponse.json(
        { error: "Failed to submit report. Please try again later." },
        { status: postRes.status >= 400 && postRes.status < 600 ? postRes.status : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Thank you. Your report has been submitted and will be reviewed by our moderation team.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in POST /api/shared/messaging/messages/[messageId]/report:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
