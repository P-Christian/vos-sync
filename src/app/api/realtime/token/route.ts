// src/app/api/realtime/token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: "Unauthorized session" },
        { status: 401 }
      );
    }

    // Determine the Directus base HTTP URL
    const rawDirectusUrl =
      process.env.DIRECTUS_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8055";

    const cleanBaseUrl = rawDirectusUrl.replace(/\/$/, "");

    // Convert HTTP(S) to WS(S)
    const isSsl = cleanBaseUrl.startsWith("https://") || cleanBaseUrl.startsWith("wss://");
    const wsProto = isSsl ? "wss://" : "ws://";
    const hostPath = cleanBaseUrl.replace(/^(?:https?|wss?):\/\//, "");
    const wsUrl = `${wsProto}${hostPath}/websocket`;

    // Secure token for WebSocket client authentication
    const token =
      process.env.WEBSOCKET_ACCESS_TOKEN ||
      process.env.DIRECTUS_STATIC_TOKEN ||
      "";

    return NextResponse.json({
      authenticated: true,
      url: wsUrl,
      token,
      userId: session.userId,
      role: session.roleName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { authenticated: false, error: message },
      { status: 500 }
    );
  }
}
