// src/app/api/realtime/stream/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { directusWsRelay, ensureDirectusRelayStarted, RelayEventPayload } from "@/lib/realtime/directus-ws-relay";
import { safeDecryptMessage } from "@/lib/message-encryption";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized session" },
        { status: 401 }
      );
    }

    // Ensure backend WebSocket connection to Directus is active
    ensureDirectusRelayStarted();

    const encoder = new TextEncoder();
    let cleanupListener: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // 1. Initial connection acknowledgment frame
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", userId: session.userId })}\n\n`)
        );

        // 2. 20-second heartbeat to prevent proxy/tunnel idle drops (Tailscale, Nginx)
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
          }
        }, 20000);

        // 3. Listen to real-time events from the Directus relay
        cleanupListener = directusWsRelay.onEvent((payload: RelayEventPayload) => {
          try {
            // User-scoped filtering for private notifications
            let filteredData = payload.data;
            if (
              payload.collection === "vs_freelancer_notification" ||
              payload.collection === "vs_employer_notification"
            ) {
              filteredData = payload.data.filter((rec) => {
                if (rec.user_id !== undefined && rec.user_id !== null) {
                  return String(rec.user_id) === String(session.userId);
                }
                return true;
              });
              if (filteredData.length === 0) return;
            }

            // Immediately decrypt vs_message message_content so clients never see ciphertext
            if (payload.collection === "vs_message") {
              filteredData = filteredData.map((rec) => {
                const copy = { ...rec };
                if (typeof copy.message_content === "string") {
                  copy.message_content = safeDecryptMessage(copy.message_content) ?? copy.message_content;
                }
                return copy;
              });
            }

            const ssePayload = {
              collection: payload.collection,
              event: payload.event,
              data: filteredData,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(ssePayload)}\n\n`)
            );
          } catch {
            // Client closed stream
          }
        });

        // Clean up on client abort
        req.signal.addEventListener("abort", () => {
          if (cleanupListener) cleanupListener();
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        if (cleanupListener) cleanupListener();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
