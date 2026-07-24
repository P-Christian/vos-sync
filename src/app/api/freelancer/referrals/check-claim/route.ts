// src/app/api/freelancer/referrals/check-claim/route.ts
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ claimed: false });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ claimed: false });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ claimed: false, error: "job_id is required" }, { status: 400 });
    }

    // Query active claim
    const claimRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_referral_claim?filter[candidate_user_id][_eq]=${userId}&filter[job_id][_eq]=${jobId}&filter[claim_status][_eq]=ACTIVE&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!claimRes.ok) return NextResponse.json({ claimed: false });

    const claimJson = await claimRes.json();
    const claims = claimJson.data || [];

    if (claims.length === 0) {
      return NextResponse.json({ claimed: false });
    }

    const claim = claims[0];
    
    // Resolve referrer name
    const refRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_referral/${claim.referral_id}?fields=referrer_user_id.user_fname,referrer_user_id.user_lname`,
      { headers: getHeaders(), cache: "no-store" }
    );
    
    let referrerName = "A VOS Sync User";
    if (refRes.ok) {
      const refData = (await refRes.json()).data;
      if (refData?.referrer_user_id) {
        referrerName = `${refData.referrer_user_id.user_fname ?? ""} ${refData.referrer_user_id.user_lname ?? ""}`.trim() || referrerName;
      }
    }

    return NextResponse.json({
      claimed: true,
      referrer_name: referrerName
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ claimed: false, error: errorMsg }, { status: 500 });
  }
}
