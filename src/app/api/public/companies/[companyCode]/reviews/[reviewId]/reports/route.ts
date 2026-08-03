import { NextRequest, NextResponse } from "next/server";
import { createReviewReport } from "@/modules/public/company-profile/services/company-profile.service";

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
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyCode: string; reviewId: string }> }
) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || req.cookies.get("vos_access_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: no token provided" }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: invalid session token" }, { status: 401 });
    }

    const { reviewId } = await params;
    const rId = Number(reviewId);
    if (isNaN(rId)) {
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.reason_code) {
      return NextResponse.json({ error: "Missing required fields (reason_code)" }, { status: 400 });
    }

    const newReport = await createReviewReport(rId, body, userId);
    if (!newReport) {
      return NextResponse.json({ error: "Failed to submit review report" }, { status: 500 });
    }

    return NextResponse.json(newReport, { status: 201 });
  } catch (error: unknown) {
    console.error("API Error in company review report POST:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
