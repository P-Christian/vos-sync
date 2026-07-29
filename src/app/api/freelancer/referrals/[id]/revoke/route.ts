// src/app/api/freelancer/referrals/[id]/revoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logReferralHistory } from "@/modules/freelancer/freelancer-referrals/services/referral.service";

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

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    // Validate ownership
    const refRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_referral/${id}?fields=referrer_user_id,status`, {
      headers: getHeaders(),
      cache: "no-store"
    });
    if (!refRes.ok) {
      return NextResponse.json({ error: "Referral not found." }, { status: 404 });
    }
    const referral = (await refRes.json()).data;
    if (!referral || referral.referrer_user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized access to this referral." }, { status: 403 });
    }

    if (referral.status === "CLAIMED" || referral.status === "APPLIED") {
      return NextResponse.json({ error: "Cannot revoke a claimed or applied referral." }, { status: 400 });
    }

    // Patch status to REVOKED
    const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_referral/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status: "REVOKED", revoked_at: new Date().toISOString() })
    });

    if (!patchRes.ok) {
      return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
    }

    await logReferralHistory(Number(id), referral.status, "REVOKED", `user:${userId}`, "Revoked by Referrer");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
