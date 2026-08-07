// src/app/api/client/talent-search/explain/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { generateMatchExplanation, ExplainCandidate } from "@/lib/gemini/matchExplainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const { isVerified, verification_status } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json(
        { error: `Restricted: Company status is ${verification_status}.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { keyword, candidate } = body as {
      keyword?: string;
      candidate?: ExplainCandidate;
    };

    if (!keyword || !candidate) {
      return NextResponse.json({ explanation: null });
    }

    const explanation = await generateMatchExplanation(keyword, candidate);
    return NextResponse.json({ explanation });
  } catch (err: unknown) {
    console.error("[talent-search/explain POST] Error:", err);
    return NextResponse.json({ explanation: null });
  }
}
