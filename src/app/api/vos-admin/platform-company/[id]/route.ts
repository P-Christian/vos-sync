import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "")
  .split("#")[0]
  .trim()
  .replace(/\/$/, "");
const DIRECTUS_TOKEN = (process.env.DIRECTUS_STATIC_TOKEN || "")
  .split("#")[0]
  .trim();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_jwt_secret_change_me");

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function getPHDateTimeString(): string {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return dtf.format(now);
}

async function getAdminUserFromToken(req: NextRequest): Promise<{ adminId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1 };
  }
  const cookieStore = await cookies();
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    cookieStore.get("vos_sync_access_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id || 1);
    return { adminId };
  } catch {
    return { adminId: 1 };
  }
}

function normalizePlatformCompany(raw: Record<string, unknown> | null) {
  if (!raw) return null;
  const meta =
    typeof raw.metadata === "string"
      ? (() => {
          try {
            return JSON.parse(raw.metadata as string);
          } catch {
            return {};
          }
        })()
      : (raw.metadata as Record<string, unknown> | null) || {};

  return {
    ...raw,
    metadata: meta,
    platform_name: (raw.platform_name as string) || (meta.platform_name as string) || (raw.company_name as string) || "VOS Sync",
    platform_icon: (raw.platform_icon as string) || (meta.platform_icon as string) || "Briefcase",
    support_hours_days: (raw.support_hours_days as string) || (meta.support_hours_days as string) || "Mon–Fri",
    support_hours_time: (raw.support_hours_time as string) || (meta.support_hours_time as string) || "8am–5pm",
    support_hours_timezone: (raw.support_hours_timezone as string) || (meta.support_hours_timezone as string) || "Philippine Time (PHT)",
    values: Array.isArray(meta.values) ? meta.values.slice(0, 4) : [],
  };
}

async function resolveCompanyId(candidateId?: number | null): Promise<number | null> {
  if (candidateId && !isNaN(candidateId)) {
    try {
      const checkRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_platform_company/${candidateId}?fields=company_id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.data?.company_id) {
          return Number(checkJson.data.company_id);
        }
      }
    } catch {
      // Fall through to query first available record
    }
  }

  try {
    const findRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_platform_company?sort[]=-is_primary&sort[]=display_order&sort[]=company_id&limit=1&fields=company_id`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (findRes.ok) {
      const findJson = await findRes.json();
      if (findJson.data && findJson.data.length > 0 && findJson.data[0]?.company_id) {
        return Number(findJson.data[0].company_id);
      }
    }
  } catch (err) {
    console.error("Error discovering platform company record:", err);
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resolvedId = await resolveCompanyId(Number(id));
    if (!resolvedId) {
      return NextResponse.json({ error: "Platform company not found" }, { status: 404 });
    }

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${resolvedId}`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Platform company not found" }, { status: res.status });
    }

    const json = await res.json();
    const normalized = normalizePlatformCompany(json.data);
    if (normalized) {
      try {
        const valRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_platform_company_value?filter[company_id][_eq]=${resolvedId}&sort=display_order&limit=4`,
          { headers: getHeaders(), cache: "no-store" }
        );
        if (valRes.ok) {
          const valJson = await valRes.json();
          if (Array.isArray(valJson.data) && valJson.data.length > 0) {
            normalized.values = valJson.data.map((v: Record<string, unknown>) => ({
              id: v.id,
              company_id: v.company_id,
              title: v.title,
              description: v.description,
              desc: v.description,
              icon_name: v.icon_name,
              icon: v.icon_name,
              color: v.color,
              display_order: v.display_order,
              is_active: Number(v.is_active) === 1 || v.is_active === true,
              created_at: v.created_at,
              updated_at: v.updated_at,
            }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch vs_platform_company_value:", e);
      }
    }
    return NextResponse.json({ data: normalized });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resolvedId = await resolveCompanyId(Number(id));
    if (!resolvedId) {
      return NextResponse.json({ error: "Platform company not found" }, { status: 404 });
    }
    const body = await req.json();

    const isPrimary =
      body.is_primary !== undefined
        ? Number(body.is_primary) === 1 || body.is_primary === true
          ? 1
          : 0
        : undefined;

    // If setting this record to primary, unset all other records to 0
    if (isPrimary === 1) {
      const existingRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_platform_company?filter[is_primary][_eq]=1&fields=company_id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const primaryItems: Array<{ company_id: number }> = existingData.data || [];
        for (const item of primaryItems) {
          if (String(item.company_id) !== String(resolvedId)) {
            await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${item.company_id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ is_primary: 0 }),
            });
          }
        }
      }
    }

    const now = getPHDateTimeString();
    const existingMetadata =
      typeof body.metadata === "string"
        ? (() => {
            try {
              return JSON.parse(body.metadata);
            } catch {
              return {};
            }
          })()
        : (body.metadata as Record<string, unknown> | null) || {};

    const updatedMetadata = {
      ...existingMetadata,
      ...(body.platform_name !== undefined ? { platform_name: body.platform_name } : {}),
      ...(body.platform_icon !== undefined ? { platform_icon: body.platform_icon } : {}),
      ...(body.support_hours_days !== undefined ? { support_hours_days: body.support_hours_days } : {}),
      ...(body.support_hours_time !== undefined ? { support_hours_time: body.support_hours_time } : {}),
      ...(body.support_hours_timezone !== undefined ? { support_hours_timezone: body.support_hours_timezone } : {}),
      ...(body.values !== undefined ? { values: Array.isArray(body.values) ? body.values.slice(0, 4) : [] } : {}),
    };

    const ALLOWED_FIELDS = [
      "slug",
      "company_code",
      "company_name",
      "platform_name",
      "company_legal_name",
      "company_tagline",
      "year_established",
      "organization_type_id",
      "industry_id",
      "company_size_id",
      "company_address",
      "company_brgy",
      "company_city",
      "company_province",
      "company_country",
      "company_zipCode",
      "map_embed_url",
      "registration_no",
      "company_tin",
      "company_contact",
      "company_email",
      "support_email",
      "support_hours_days",
      "support_hours_time",
      "support_hours_timezone",
      "company_website",
      "company_logo",
      "platform_icon",
      "company_cover",
      "company_facebook",
      "company_linkedin",
      "company_instagram",
      "company_x",
      "company_youtube",
      "company_short_description",
      "company_description",
      "company_mission",
      "company_vision",
      "company_culture",
      "company_benefits",
      "company_tags",
    ];

    const updatePayload: Record<string, unknown> = {
      metadata: updatedMetadata,
      updated_at: now,
      updated_by_user_id: auth?.adminId ?? 1,
    };

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field];
      }
    }

    if (isPrimary !== undefined) {
      updatePayload.is_primary = isPrimary;
    }
    if (body.is_active !== undefined) {
      updatePayload.is_active = Number(body.is_active) === 1 || body.is_active === true ? 1 : 0;
    }
    if (body.display_order !== undefined) {
      updatePayload.display_order = Number(body.display_order) || 0;
    }

    const updateRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${resolvedId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Failed to update platform company" },
        { status: updateRes.status }
      );
    }

    const updatedJson = await updateRes.json();
    const normalized = normalizePlatformCompany(updatedJson.data);

    // Synchronize vs_platform_company_value table
    if (Array.isArray(body.values)) {
      const submittedValues = (body.values as Array<Record<string, unknown>>).slice(0, 4);
      try {
        const existingValuesRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_platform_company_value?filter[company_id][_eq]=${resolvedId}&fields=id`,
          { headers: getHeaders(), cache: "no-store" }
        );
        const existingIds = new Set<number>();
        if (existingValuesRes.ok) {
          const evJson = await existingValuesRes.json();
          if (Array.isArray(evJson.data)) {
            evJson.data.forEach((r: { id: number }) => existingIds.add(Number(r.id)));
          }
        }

        const retainedIds = new Set<number>();
        const savedValues: Array<Record<string, unknown>> = [];

        for (let idx = 0; idx < submittedValues.length; idx++) {
          const val = submittedValues[idx];
          const valPayload = {
            company_id: Number(resolvedId),
            title: String(val.title || ""),
            description: String(val.description || val.desc || ""),
            icon_name: String(val.icon_name || val.icon || "HeartHandshake"),
            color: String(val.color || "bg-blue-500/10 text-blue-500"),
            display_order: typeof val.display_order === "number" ? val.display_order : idx + 1,
            is_active: val.is_active === false || Number(val.is_active) === 0 ? 0 : 1,
            updated_at: now,
          };

          const rawId = val.id ? Number(val.id) : null;
          if (rawId && existingIds.has(rawId)) {
            retainedIds.add(rawId);
            const patchValRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company_value/${rawId}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify(valPayload),
            });
            if (patchValRes.ok) {
              const pvJson = await patchValRes.json();
              savedValues.push(pvJson.data);
            }
          } else {
            const createValRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company_value`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({ ...valPayload, created_at: now }),
            });
            if (createValRes.ok) {
              const createdValJson = await createValRes.json();
              if (createdValJson.data?.id) {
                retainedIds.add(Number(createdValJson.data.id));
                savedValues.push(createdValJson.data);
              }
            }
          }
        }

        // Delete records no longer in submitted values
        for (const existingId of existingIds) {
          if (!retainedIds.has(existingId)) {
            await fetch(`${DIRECTUS_BASE}/items/vs_platform_company_value/${existingId}`, {
              method: "DELETE",
              headers: getHeaders(),
            });
          }
        }

        if (normalized && savedValues.length > 0) {
          normalized.values = savedValues.map((v: Record<string, unknown>) => ({
            id: v.id,
            company_id: v.company_id,
            title: v.title,
            description: v.description,
            desc: v.description,
            icon_name: v.icon_name,
            icon: v.icon_name,
            color: v.color,
            display_order: v.display_order,
            is_active: Number(v.is_active) === 1 || v.is_active === true,
            created_at: v.created_at,
            updated_at: v.updated_at,
          }));
        }
      } catch (err) {
        console.error("Error syncing vs_platform_company_value:", err);
      }
    }

    return NextResponse.json({ data: normalized });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminUserFromToken(req);
    if (!auth && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleteRes = await fetch(`${DIRECTUS_BASE}/items/vs_platform_company/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.errors?.[0]?.message || "Failed to delete platform company" },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
