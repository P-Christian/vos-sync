// src/app/api/client/notifications/preferences/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isClientSession } from "@/lib/authenticated-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
}

// ─── GET — Fetch notification preferences for logged-in user ─────────────

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_notification_preference?filter[user_id][_eq]=${userId}&fields=preference_id,user_id,category,email_enabled,in_app_enabled,updated_at&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Directus preferences fetch error:", text);
      return NextResponse.json(
        { error: "Failed to fetch notification preferences." },
        { status: res.status }
      );
    }

    const json = await res.json();
    const rawPrefs: Record<string, unknown>[] = json.data ?? [];

    const existingMap = new Map<string, { preference_id?: number; email_enabled: boolean; in_app_enabled: boolean; updated_at?: string | null }>();
    rawPrefs.forEach((p) => {
      const cat = String(p.category ?? "");
      if (cat) {
        existingMap.set(cat, {
          preference_id: Number(p.preference_id),
          email_enabled: p.email_enabled === 1 || p.email_enabled === true,
          in_app_enabled: p.in_app_enabled === 1 || p.in_app_enabled === true,
          updated_at: (p.updated_at as string) ?? null,
        });
      }
    });

    // Known categories list
    const knownCategories: { category: string; defaultEmail: boolean; defaultInApp: boolean }[] = [
      { category: "APPLICATION_RECEIVED", defaultEmail: true, defaultInApp: true },
      { category: "APPLICATION_WITHDRAWN", defaultEmail: true, defaultInApp: true },
      { category: "APPLICATION_STATUS_UPDATED", defaultEmail: true, defaultInApp: true },
      { category: "MESSAGE_RECEIVED", defaultEmail: true, defaultInApp: true },
      { category: "UNREAD_MESSAGE_REMINDER", defaultEmail: true, defaultInApp: true },
      { category: "INTERVIEW_SCHEDULED", defaultEmail: true, defaultInApp: true },
      { category: "INTERVIEW_RESCHEDULED", defaultEmail: true, defaultInApp: true },
      { category: "INTERVIEW_CANCELLED", defaultEmail: true, defaultInApp: true },
      { category: "INTERVIEW_REMINDER", defaultEmail: true, defaultInApp: true },
      { category: "JOB_APPROVED", defaultEmail: true, defaultInApp: true },
      { category: "JOB_REJECTED", defaultEmail: true, defaultInApp: true },
      { category: "JOB_EXPIRED", defaultEmail: true, defaultInApp: true },
      { category: "TEAM_ACTIVITY", defaultEmail: true, defaultInApp: true },
      { category: "PRODUCT_UPDATES", defaultEmail: false, defaultInApp: true },
      { category: "MARKETING_UPDATES", defaultEmail: false, defaultInApp: false },
    ];

    const preferences = knownCategories.map((kc) => {
      const existing = existingMap.get(kc.category);
      if (existing) {
        return {
          preference_id: existing.preference_id,
          user_id: userId,
          category: kc.category,
          email_enabled: existing.email_enabled,
          in_app_enabled: existing.in_app_enabled,
          updated_at: existing.updated_at ?? null,
        };
      }
      return {
        user_id: userId,
        category: kc.category,
        email_enabled: kc.defaultEmail,
        in_app_enabled: kc.defaultInApp,
        updated_at: null,
      };
    });

    // Also include any custom/legacy categories from DB that are not in knownCategories
    existingMap.forEach((val, key) => {
      if (!knownCategories.some((kc) => kc.category === key)) {
        preferences.push({
          preference_id: val.preference_id,
          user_id: userId,
          category: key,
          email_enabled: val.email_enabled,
          in_app_enabled: val.in_app_enabled,
          updated_at: val.updated_at ?? null,
        });
      }
    });

    return NextResponse.json({ preferences });
  } catch (err: unknown) {
    console.error("GET /api/client/notifications/preferences error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT — Upsert notification preferences ───────────────────────────────

interface PreferenceInput {
  category: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isClientSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: employer access required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

    const body = await req.json().catch(() => null);
    const incoming: PreferenceInput[] = body?.preferences ?? [];

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json(
        { error: "No preferences provided." },
        { status: 400 }
      );
    }

    // Fetch existing preferences to determine create vs update
    const existRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_notification_preference?filter[user_id][_eq]=${userId}&fields=preference_id,category&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );

    const existJson = await existRes.json();
    const existing: { preference_id: number; category: string }[] =
      existJson.data ?? [];

    const existingMap = new Map(
      existing.map((e) => [e.category, e.preference_id])
    );

    const results = await Promise.allSettled(
      incoming.map(async (pref) => {
        const existingId = existingMap.get(pref.category);

        if (existingId) {
          // Update
          const res = await fetch(
            `${DIRECTUS_BASE}/items/vs_notification_preference/${existingId}`,
            {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({
                email_enabled: pref.email_enabled ? 1 : 0,
                in_app_enabled: pref.in_app_enabled ? 1 : 0,
              }),
            }
          );
          if (!res.ok) throw new Error(`Failed to update pref: ${pref.category}`);
        } else {
          // Create
          const res = await fetch(
            `${DIRECTUS_BASE}/items/vs_notification_preference`,
            {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                user_id: userId,
                category: pref.category,
                email_enabled: pref.email_enabled ? 1 : 0,
                in_app_enabled: pref.in_app_enabled ? 1 : 0,
              }),
            }
          );
          if (!res.ok) throw new Error(`Failed to create pref: ${pref.category}`);
        }
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("Some preferences failed to save:", failed);
      return NextResponse.json(
        { error: "Some preferences could not be saved. Please try again." },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("PUT /api/client/notifications/preferences error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
