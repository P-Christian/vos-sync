// src/app/api/client/pipelines/[id]/transitions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { updateStageTransitions } from "@/modules/client/pipeline/services/pipeline.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

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

async function getCompanyId(userId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    return json.data?.[0]?.company_id ?? null;
  } catch {
    return null;
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pipelineId = Number(id);

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_sync_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Company association not found." }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body?.from_stage_id || !Array.isArray(body?.target_stage_ids)) {
      return NextResponse.json(
        { error: "from_stage_id and target_stage_ids (array) are required." },
        { status: 400 }
      );
    }

    const result = await updateStageTransitions(
      pipelineId,
      Number(body.from_stage_id),
      body.target_stage_ids.map(Number),
      companyId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to update transitions." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/client/pipelines/[id]/transitions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update transitions." },
      { status: 500 }
    );
  }
}
