// src/app/api/client/settings/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, extractClientIp, resolveIpGeo } from "@/lib/auth-utils";
import {
  getActiveSessionsForUser,
  revokeUserSession,
  revokeOtherUserSessions,
  parseUserAgent,
} from "@/modules/auth/sessions/session.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthInfoFromReq(req: NextRequest): { userId: number | null; sid: string | null } {
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.cookies.get("vos_sync_access_token")?.value;
  if (!token) return { userId: null, sid: null };
  const decoded = decodeJwtPayload(token);
  const id = decoded?.user_id ?? decoded?.sub ?? decoded?.id ?? null;
  const sid = typeof decoded?.sid === "string" ? decoded.sid : null;
  return { userId: id !== null ? Number(id) : null, sid };
}

// GET: Fetch active sessions for the client user
export async function GET(req: NextRequest) {
  try {
    const { userId, sid: currentSid } = getAuthInfoFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dbSessions = await getActiveSessionsForUser(userId);

    const ip = extractClientIp(req.headers) || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Browser";

    if (dbSessions.length === 0) {
      const { deviceName, browserName, deviceType } = parseUserAgent(userAgent);
      let location = "Manila, Philippines (Localhost)";
      if (ip !== "127.0.0.1" && ip !== "::1") {
        const geo = await resolveIpGeo(ip);
        location = geo ? `Philippines (approx lat: ${geo.latitude}, lon: ${geo.longitude})` : "Manila, Philippines";
      }

      return NextResponse.json({
        sessions: [
          {
            session_id: currentSid || "current-session",
            device: deviceName,
            device_type: deviceType,
            browser: browserName,
            deployment_id: req.headers.get("host") || "local",
            ip_address: ip,
            location: location,
            last_active: "Active now",
            is_current: true,
          },
        ],
      });
    }

    const sessions = dbSessions.map((s) => ({
      session_id: s.session_id,
      device: s.device_name || "Device",
      device_type: s.device_type,
      browser: s.browser_name || "Browser",
      deployment_id: s.deployment_id,
      ip_address: s.ip_address || "Unknown IP",
      location: s.location_label || "Philippines",
      last_active: s.session_id === currentSid ? "Active now" : (s.last_activity_at || s.created_at),
      is_current: Boolean(currentSid && s.session_id === currentSid),
    }));

    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    console.error("GET /api/client/settings/sessions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Terminate a session or all other sessions
export async function DELETE(req: NextRequest) {
  try {
    const { userId, sid: currentSid } = getAuthInfoFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    if (sessionId === "all-other") {
      const count = await revokeOtherUserSessions(userId, currentSid, "USER_REVOKE_OTHERS");
      return NextResponse.json({ success: true, terminated: "all-other", count });
    }

    await revokeUserSession(sessionId, "USER_REVOKED");
    return NextResponse.json({ success: true, terminated: sessionId });
  } catch (err: unknown) {
    console.error("DELETE /api/client/settings/sessions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
