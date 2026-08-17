// src/app/api/vos-admin/job-roles/suggestions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPHTimeString } from "@/lib/utils";
import { slugifyCode } from "@/modules/vos-admin/role-matching/validators";
import type {
  IntelligenceRequest,
  IntelligenceRequestStatus,
  ResolutionType,
} from "@/modules/vos-admin/role-matching/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

/** Normalize a raw `vs_role_category_suggestion` DB row into IntelligenceRequest. */
function normalizeRow(row: Record<string, unknown>): IntelligenceRequest {
  return {
    suggestion_id: Number(row.suggestion_id),
    job_id: row.job_id != null ? Number(row.job_id) : null,
    entity_type: "JOB_CATEGORY",
    source: "CLIENT",
    category_name: (row.category_name as string) ?? null,
    category_description: (row.category_description as string | null) ?? null,
    company_id: row.company_id != null ? Number(row.company_id) : null,
    suggested_by_user_id: row.suggested_by_user_id != null ? Number(row.suggested_by_user_id) : null,
    status: (row.status as IntelligenceRequestStatus) ?? "PENDING",
    resolution_type: (row.resolution_type as ResolutionType | null) ?? null,
    resolved_category_id: row.resolved_category_id != null ? Number(row.resolved_category_id) : null,
    admin_remarks: (row.admin_remarks as string | null) ?? null,
    reviewed_by: row.reviewed_by != null ? Number(row.reviewed_by) : null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

// ── GET /api/vos-admin/job-roles/suggestions ────────────────────────────────
// Query params:
//   status: PENDING | APPROVED | REJECTED (optional — omit for ALL)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    let url = `${DIRECTUS_BASE}/items/vs_role_category_suggestion?sort[]=-created_at&limit=-1`;

    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
      url += `&filter[status][_eq]=${statusFilter}`;
    }

    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch intelligence requests.");

    const json = await res.json();
    const rows: Record<string, unknown>[] = json.data ?? [];
    const requests: IntelligenceRequest[] = rows.map(normalizeRow);

    return NextResponse.json({ requests });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Server error" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/vos-admin/job-roles/suggestions ─────────────────────────────
// Body:
//   suggestion_id: number                           (required)
//   action: "APPROVE" | "REJECT"                    (required)
//   resolution_type?: "CREATED_NEW" | "MAPPED_EXISTING" | "REJECTED"
//   -- for CREATED_NEW --
//   category_name?: string
//   category_description?: string
//   category_code?: string
//   -- for MAPPED_EXISTING --
//   existing_category_id?: number
//   -- for all (mandatory for REJECT) --
//   admin_remarks?: string
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      suggestion_id,
      action,
      resolution_type,
      category_name,
      category_description,
      category_code,
      existing_category_id,
      admin_remarks,
    } = body as {
      suggestion_id?: number;
      action?: string;
      resolution_type?: ResolutionType;
      category_name?: string;
      category_description?: string;
      category_code?: string;
      existing_category_id?: number;
      admin_remarks?: string;
    };

    if (!suggestion_id || isNaN(Number(suggestion_id))) {
      return NextResponse.json({ error: "suggestion_id is required." }, { status: 400 });
    }
    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "action must be APPROVE or REJECT." }, { status: 400 });
    }

    // 1. Fetch existing suggestion
    const sgRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_role_category_suggestion/${suggestion_id}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!sgRes.ok) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }
    const sgData = (await sgRes.json()).data as Record<string, unknown>;
    if (!sgData) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }
    if (sgData.status !== "PENDING") {
      return NextResponse.json(
        { error: `Suggestion is already ${sgData.status}. Only PENDING suggestions can be reviewed.` },
        { status: 409 }
      );
    }

    const nowPH = getPHTimeString();
    const linkedJobId = sgData.job_id != null ? Number(sgData.job_id) : null;

    // ── APPROVE ──────────────────────────────────────────────────────────────
    if (action === "APPROVE") {
      // Option A: Map to Existing Category
      if (resolution_type === "MAPPED_EXISTING") {
        const catId = Number(existing_category_id);
        if (!catId || isNaN(catId)) {
          return NextResponse.json(
            { error: "existing_category_id is required when mapping to an existing category." },
            { status: 400 }
          );
        }

        // Fetch existing category to get canonical name
        const catRes = await fetch(`${DIRECTUS_BASE}/items/vs_role_category/${catId}`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (!catRes.ok) {
          return NextResponse.json({ error: "Selected existing category does not exist." }, { status: 404 });
        }
        const existingCat = (await catRes.json()).data;
        const canonicalName = existingCat?.category_name || (sgData.category_name as string);

        // Update linked job posting if present
        if (linkedJobId && !isNaN(linkedJobId)) {
          try {
            await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${linkedJobId}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({
                category_id: catId,
                job_category: canonicalName,
                updated_at: nowPH,
              }),
            });
          } catch (linkErr) {
            console.error(`[Suggestions API] Failed to update linked job_id ${linkedJobId}:`, linkErr);
          }
        }

        // Update suggestion status
        await fetch(`${DIRECTUS_BASE}/items/vs_role_category_suggestion/${suggestion_id}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            status: "APPROVED",
            resolution_type: "MAPPED_EXISTING",
            resolved_category_id: catId,
            admin_remarks: (admin_remarks ?? "").trim() || null,
            reviewed_at: nowPH,
            updated_at: nowPH,
          }),
        });

        return NextResponse.json({
          success: true,
          action: "APPROVED",
          resolution_type: "MAPPED_EXISTING",
          suggestion_id,
          resolved_category_id: catId,
          linked_job_id: linkedJobId,
        });
      }

      // Option B: Create New Category
      const finalName = (category_name ?? (sgData.category_name as string) ?? "").trim();
      if (!finalName) {
        return NextResponse.json({ error: "Category name is required to approve." }, { status: 400 });
      }

      const finalCode = (category_code ?? slugifyCode(finalName)).trim();
      const finalDesc = (category_description ?? (sgData.category_description as string | null) ?? "").trim();

      // Create official category
      const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_role_category`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          category_name: finalName,
          category_code: finalCode,
          description: finalDesc || null,
          is_active: true,
          created_at: nowPH,
          updated_at: nowPH,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Failed to create official category. ${errText}` },
          { status: 502 }
        );
      }

      const createdCategory = (await createRes.json()).data;
      const createdCategoryId = Number(createdCategory?.category_id ?? createdCategory?.id);

      // Link job posting if present
      if (linkedJobId && !isNaN(linkedJobId) && createdCategoryId) {
        try {
          await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${linkedJobId}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({
              category_id: createdCategoryId,
              job_category: finalName,
              updated_at: nowPH,
            }),
          });
        } catch (linkErr) {
          console.error(`[Suggestions API] Failed to update linked job_id ${linkedJobId}:`, linkErr);
        }
      }

      // Update suggestion status
      await fetch(`${DIRECTUS_BASE}/items/vs_role_category_suggestion/${suggestion_id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "APPROVED",
          resolution_type: "CREATED_NEW",
          resolved_category_id: createdCategoryId,
          admin_remarks: (admin_remarks ?? "").trim() || null,
          reviewed_at: nowPH,
          updated_at: nowPH,
        }),
      });

      return NextResponse.json({
        success: true,
        action: "APPROVED",
        resolution_type: "CREATED_NEW",
        suggestion_id,
        resolved_category_id: createdCategoryId,
        linked_job_id: linkedJobId,
        created_category: createdCategory,
      });
    }

    // ── REJECT ───────────────────────────────────────────────────────────────
    // Rejection requires admin remarks explaining why the taxonomy candidate was rejected
    const trimmedRemarks = (admin_remarks ?? "").trim();
    if (!trimmedRemarks) {
      return NextResponse.json(
        { error: "Rejection reason / admin remarks are required when rejecting a suggestion." },
        { status: 400 }
      );
    }

    const rejectRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_role_category_suggestion/${suggestion_id}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "REJECTED",
          resolution_type: "REJECTED",
          resolved_category_id: null,
          admin_remarks: trimmedRemarks,
          reviewed_at: nowPH,
          updated_at: nowPH,
        }),
      }
    );

    if (!rejectRes.ok) {
      throw new Error("Failed to update suggestion status.");
    }

    return NextResponse.json({
      success: true,
      action: "REJECTED",
      resolution_type: "REJECTED",
      suggestion_id,
      linked_job_id: linkedJobId,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Server error" },
      { status: 500 }
    );
  }
}
