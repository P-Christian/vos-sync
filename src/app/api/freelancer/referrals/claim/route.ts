// src/app/api/freelancer/referrals/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { claimReferralRecord } from "@/modules/freelancer/freelancer-referrals/services/referral.service";

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

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { referral_id, job_id, consent_version } = body;

    if (!referral_id || !job_id) {
      return NextResponse.json({ error: "Referral ID and Job ID are required." }, { status: 400 });
    }

    const claim = await claimReferralRecord(
      Number(referral_id),
      userId,
      Number(job_id),
      consent_version || "1.0"
    );

    return NextResponse.json({ success: true, claim });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to claim referral." }, { status: 500 });
  }
}
