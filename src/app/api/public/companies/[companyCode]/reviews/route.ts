import { NextRequest, NextResponse } from "next/server";
import { getPublicCompanyByCode, getPublicCompanyReviews, createCompanyReview } from "@/modules/public/company-profile/services/company-profile.service";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyCode: string }> }
) {
  try {
    const { companyCode } = await params;
    const company = await getPublicCompanyByCode(companyCode);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const reviews = await getPublicCompanyReviews(company.company_id, limit);
    return NextResponse.json(reviews);
  } catch (error: unknown) {
    console.error("API Error in company reviews GET:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyCode: string }> }
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

    const { companyCode } = await params;
    const company = await getPublicCompanyByCode(companyCode);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.employment_status || !body.review_text || body.overall_rating == null) {
      return NextResponse.json({ error: "Missing required fields (employment_status, overall_rating, review_text)" }, { status: 400 });
    }

    const newReview = await createCompanyReview(company.company_id, body, userId);
    if (!newReview) {
      return NextResponse.json({ error: "Failed to create review in database" }, { status: 500 });
    }

    return NextResponse.json(newReview, { status: 201 });
  } catch (error: unknown) {
    console.error("API Error in company reviews POST:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
