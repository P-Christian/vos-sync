// src/app/api/freelancer/profile-views/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { authenticateRequest } from "@/lib/authenticated-session";

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

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    const viewerUserId = session?.userId ? Number(session.userId) : null;
    if (!viewerUserId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.viewed_user_id) {
      return NextResponse.json({ error: "viewed_user_id is required." }, { status: 400 });
    }

    const viewedUserId = Number(body.viewed_user_id);

    // Skip tracking if user views their own profile
    if (viewedUserId === viewerUserId) {
      return NextResponse.json({ success: true, message: "Ignored self-view" });
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const payload = {
      viewed_user_id: viewedUserId,
      viewer_user_id: viewerUserId,
      viewed_at: nowPH,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_profile_view`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to log profile view." },
        { status: res.status }
      );
    }

    // Fetch viewer user's name & role
    let viewerName = "Someone";
    let viewerRole = "CLIENT";
    try {
      const viewerRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${viewerUserId}?fields=user_fname,user_lname,role`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      if (viewerRes.ok) {
        const viewerJson = await viewerRes.json();
        const fname = viewerJson.data?.user_fname || "";
        const lname = viewerJson.data?.user_lname || "";
        viewerRole = viewerJson.data?.role || "CLIENT";
        if (fname || lname) {
          viewerName = `${fname} ${lname}`.trim();
        }
      }
    } catch (e) {
      console.error("Failed to fetch viewer details:", e);
    }

    const actionUrl = viewerRole === "FREELANCER"
      ? `/vos-sync/public/freelancer/${viewerUserId}`
      : `/vos-sync/public/client/${viewerUserId}`;

    // Trigger notification
    await createNotification({
      event_type: "profile_view",
      recipient_user_id: viewedUserId,
      entity_type: "user",
      entity_id: viewerUserId,
      category: "Profile Activity",
      title: "New Profile View",
      message: `${viewerName} recently viewed your profile.`,
      action_url: actionUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Profile view logged.",
    });
  } catch (err: unknown) {
    console.error("POST /api/freelancer/profile-views error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
