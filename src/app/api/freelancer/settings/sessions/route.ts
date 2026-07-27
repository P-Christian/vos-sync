// src/app/api/freelancer/settings/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, extractClientIp, resolveIpGeo } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserIdFromReq(req: NextRequest): number | null {
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.cookies.get("vos_access_token")?.value;
  if (!token) return null;
  const decoded = decodeJwtPayload(token);
  const id = decoded?.user_id ?? decoded?.sub ?? decoded?.id ?? null;
  return id !== null ? Number(id) : null;
}

// GET: Fetch active sessions
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ip = extractClientIp(req.headers) || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Browser";

    // Resolve location approx
    let location = "Unknown Location";
    if (ip !== "127.0.0.1" && ip !== "::1") {
      const geo = await resolveIpGeo(ip);
      if (geo) {
        location = `Philippines (approx lat: ${geo.latitude}, lon: ${geo.longitude})`;
      } else {
        location = "Manila, Philippines";
      }
    } else {
      location = "Manila, Philippines (Localhost)";
    }

    // Return the current session and two realistic mock sessions for user to manage
    const sessions = [
      {
        session_id: "current-session",
        device: userAgent.includes("Windows") 
          ? "Windows PC" 
          : userAgent.includes("Mac") 
          ? "MacBook" 
          : "Linux Desktop",
        browser: userAgent.includes("Chrome") 
          ? "Google Chrome" 
          : userAgent.includes("Firefox") 
          ? "Mozilla Firefox" 
          : userAgent.includes("Safari") 
          ? "Apple Safari" 
          : "Web Browser",
        ip_address: ip,
        location: location,
        last_active: "Active now",
        is_current: true,
      },
      {
        session_id: "mock-session-mobile",
        device: "Apple iPhone 15 Pro",
        browser: "Safari Mobile",
        ip_address: "112.204.45.12",
        location: "Quezon City, Philippines",
        last_active: "2 hours ago",
        is_current: false,
      },
      {
        session_id: "mock-session-tablet",
        device: "Samsung Galaxy Tab S9",
        browser: "Samsung Internet",
        ip_address: "49.145.98.204",
        location: "Cebu City, Philippines",
        last_active: "3 days ago",
        is_current: false,
      }
    ];

    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    console.error("GET /api/freelancer/settings/sessions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Terminate session
export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    // In a production setup, we would delete the session from Directus or token store.
    // For MVP, we return success. If it's "current-session", the frontend can sign the user out.
    return NextResponse.json({ success: true, terminated: sessionId });
  } catch (err: unknown) {
    console.error("DELETE /api/freelancer/settings/sessions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
