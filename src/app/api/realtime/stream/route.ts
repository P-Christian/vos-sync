// src/app/api/realtime/stream/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { directusWsRelay, ensureDirectusRelayStarted, RelayEventPayload, resolveSenderName } from "@/lib/realtime/directus-ws-relay";

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
            controller.enqueue(encoder.encode(": ping\nevent: ping\ndata: {}\n\n"));
          } catch {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
          }
        }, 20000);

        // 3. Listen to real-time events from the Directus relay
        cleanupListener = directusWsRelay.onEvent(async (payload: RelayEventPayload) => {
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

            // Participant-scoped filtering and sender_name guarantee for messages
            if (payload.collection === "vs_message") {
              // Guarantee sender_name is resolved on every message record before streaming
              await Promise.all(
                payload.data.map(async (rec) => {
                  if (!rec.sender_name && rec.sender_id != null) {
                    const name = await resolveSenderName(Number(rec.sender_id));
                    if (name) {
                      rec.sender_name = name;
                    }
                  }
                })
              );

              filteredData = payload.data.filter((rec) => {
                const clientId = rec.client_id;
                const freelancerId = rec.freelancer_id;
                // If participant IDs are present, enforce the check.
                // If absent (e.g. reaction update without participant data), allow through.
                if (clientId == null && freelancerId == null) return true;
                return (
                  String(clientId) === String(session.userId) ||
                  String(freelancerId) === String(session.userId)
                );
              });
              if (filteredData.length === 0) return;
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
