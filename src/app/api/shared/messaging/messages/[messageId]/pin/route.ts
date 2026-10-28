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

// POST: Toggle pin/unpin on a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const msgIdNum = Number(messageId);
    if (!msgIdNum || isNaN(msgIdNum)) {
      return NextResponse.json({ error: "Invalid message ID." }, { status: 400 });
    }

    const session = await authenticateRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = Number(session.userId);

    // Fetch the message to get its current pinned state and conversation_id
    const msgRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_message/${msgIdNum}?fields=message_id,conversation_id,is_pinned,pinned_by,pinned_at,is_deleted`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!msgRes.ok) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const msgData = (await msgRes.json()).data;
    if (!msgData) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    // Verify user is a member of the conversation
    const convId = msgData.conversation_id;
    const convRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_conversation/${convId}?fields=conversation_id,client_id,freelancer_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!convRes.ok) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const convData = (await convRes.json()).data;
    if (
      !convData ||
      (Number(convData.client_id) !== userId && Number(convData.freelancer_id) !== userId)
    ) {
      return NextResponse.json(
        { error: "Forbidden: You are not a participant in this conversation." },
        { status: 403 }
      );
    }

    const now = getPHTimeString();
    let nextIsPinned = false;
    let usedPinTable = false;

    // 1. Try dedicated vs_message_pin table
    try {
      const existingPinRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_message_pin?filter[user_id][_eq]=${userId}&filter[message_id][_eq]=${msgIdNum}&fields=pin_id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (existingPinRes.ok) {
        usedPinTable = true;
        const existingData = (await existingPinRes.json()).data ?? [];
        if (existingData.length > 0) {
          // Unpin (always allowed, even if message was deleted)
          const pinId = existingData[0].pin_id;
          await fetch(`${DIRECTUS_BASE}/items/vs_message_pin/${pinId}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
          nextIsPinned = false;
        } else {
          // Creating a new pin is forbidden if message is deleted
          if (msgData.is_deleted) {
            return NextResponse.json({ error: "Cannot pin a deleted message." }, { status: 400 });
          }

          // Pin: check limit of 25 pins per conversation
          const countRes = await fetch(
            `${DIRECTUS_BASE}/items/vs_message_pin?filter[user_id][_eq]=${userId}&filter[conversation_id][_eq]=${convId}&fields=pin_id&limit=100`,
            { headers: getHeaders(), cache: "no-store" }
          );
          const currentPins = (await countRes.json()).data ?? [];
          if (currentPins.length >= 25) {
            return NextResponse.json(
              { error: "You can pin up to 25 messages per conversation." },
              { status: 400 }
            );
          }

          const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_message_pin`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              message_id: msgIdNum,
              conversation_id: convId,
              user_id: userId,
              pinned_at: now,
            }),
          });
          if (!createRes.ok) {
            throw new Error("Failed to insert pin");
          }
          nextIsPinned = true;
        }
      }
    } catch {
      usedPinTable = false;
    }

    // 2. Fallback to vs_message if vs_message_pin table is not available
    if (!usedPinTable) {
      const isCurrentlyPinned = Boolean(
        msgData.is_pinned && (Number(msgData.pinned_by) === userId || !msgData.pinned_by)
      );

      if (!isCurrentlyPinned && msgData.is_deleted) {
        return NextResponse.json({ error: "Cannot pin a deleted message." }, { status: 400 });
      }

      nextIsPinned = !isCurrentlyPinned;

      const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_message/${msgIdNum}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          is_pinned: nextIsPinned,
          pinned_at: nextIsPinned ? now : null,
          pinned_by: nextIsPinned ? userId : null,
        }),
      });

      if (!patchRes.ok) {
        const err = await patchRes.text();
        console.error("Directus pin message error:", err);
        return NextResponse.json({ error: "Failed to update pin status." }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message_id: msgIdNum,
      is_pinned: nextIsPinned,
      pinned_at: nextIsPinned ? now : null,
      pinned_by: nextIsPinned ? userId : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in POST /api/shared/messaging/messages/[messageId]/pin:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
