// src/app/api/freelancer/referrals/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { claimReferralRecord } from "@/modules/freelancer/freelancer-referrals/services/referral.service";
import { authenticateRequest, isFreelancerSession } from "@/lib/authenticated-session";

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session && !isFreelancerSession(session) && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: freelancer role required." }, { status: 403 });
    }

    const userId = session?.userId ? Number(session.userId) : 1;

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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to claim referral.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
