import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { z, ZodError } from "zod";
import {
  SCHOOL_SEARCH_LIMIT,
  classifySearchRow,
  isBlankSearchTerm,
  schoolRouteCandidateSchema,
  searchClassifiedSchools,
} from "@/modules/vos-admin/school-verification/services/schoolRouteSearch.repo";

import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

async function verifyAdminRole(
  req: NextRequest
): Promise<{ adminId: number; roleId: number } | null> {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return { adminId: 1, roleId: 3 };
  }
  // Prefer the Authorization header so handler-level verification works
  // outside a Next request scope; fall back to the session cookie.
  const headerToken =
    req.headers.get("authorization")?.replace("Bearer ", "") || null;
  let token = headerToken;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("vos_access_token")?.value ?? null;
    } catch {
      token = null;
    }
  }
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = Number(payload.sub || payload.user_id || payload.id);
    const roleId = Number(payload.role_id ?? payload.role ?? 0);
    return { adminId, roleId };
  } catch {
    return null;
  }
}

// LOCKED Todo 4 search-term contract: trimmed, capped at 100 characters,
// never silently truncated. Blank returns an empty array (never a dump).
const searchTermSchema = z
  .string()
  .trim()
  .min(1, "Search term must not be empty.")
  .max(100, "Search term must be at most 100 characters.");

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing token" },
        { status: 401 }
      );
    }

    // Role restriction: VOS Admin only
    if (
      auth.roleId !== 3 &&
      process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to administrators" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("search");
    if (isBlankSearchTerm(raw)) {
      return NextResponse.json({ schools: [] });
    }
    const termResult = searchTermSchema.safeParse(raw);
    if (!termResult.success) {
      const [firstIssue] = termResult.error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid search term." },
        { status: 400 }
      );
    }

    const schools = await searchClassifiedSchools(termResult.data);
    const parsed = schoolRouteCandidateSchema
      .array()
      .max(SCHOOL_SEARCH_LIMIT)
      .parse(schools);
    return NextResponse.json({ schools: parsed });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const [firstIssue] = error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid school data." },
        { status: 400 }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }
}

// Plan 2 Todo 6: guarded VOS-Admin-only Draft-placeholder creation.
// The system never auto-creates a school row from freelancer free text;
// only this endpoint (wired by Todo 7 to the decision dialog) creates
// exactly one normalized placeholder per identity.

function directusBase(): string {
  return (
    process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || ""
  ).replace(/\/$/, "");
}

function directusHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

const placeholderBodySchema = z.object({
  school_name: z
    .string()
    .trim()
    .min(1, "School name must not be empty.")
    .max(200, "School name must be at most 200 characters."),
  city_municipality: z
    .string()
    .trim()
    .max(100, "City/municipality must be at most 100 characters.")
    .optional()
    .nullable(),
  province: z
    .string()
    .trim()
    .max(100, "Province must be at most 100 characters.")
    .optional()
    .nullable(),
});

const placeholderRowSchema = z.object({
  school_id: z.number().int(),
  school_name: z.string(),
  city_municipality: z.string().nullable(),
  province: z.string().nullable(),
  school_status: z.string(),
  verification_status: z.string(),
  is_active: z.union([z.boolean(), z.number(), z.string()]).optional(),
});

const placeholderAdminRowSchema = z.object({
  school_id: z.union([
    z.number().int(),
    z.object({ school_id: z.number().int() }),
  ]),
  is_active: z.union([z.boolean(), z.number(), z.string()]).optional(),
});

/** Collapse internal whitespace and trim; comparison additionally lowercases. */
function normalizeIdentityPart(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRole(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing token" },
        { status: 401 }
      );
    }

    // Role restriction: VOS Admin only
    if (
      auth.roleId !== 3 &&
      process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to administrators" },
        { status: 403 }
      );
    }

    const raw = (await req.json()) as unknown;
    const parsed = placeholderBodySchema.safeParse(raw);
    if (!parsed.success) {
      const [firstIssue] = parsed.error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid placeholder input." },
        { status: 400 }
      );
    }

    const schoolName = normalizeIdentityPart(parsed.data.school_name);
    if (schoolName === "") {
      return NextResponse.json(
        { error: "School name must not be empty." },
        { status: 400 }
      );
    }
    const city = parsed.data.city_municipality?.trim() || null;
    const province = parsed.data.province?.trim() || null;

    const base = directusBase();
    if (!base) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Repeat a normalized search BEFORE creating anything: an exact
    // normalized (name + city + province) match is reused, multiple
    // plausible matches fail closed into VOS resolution (409), and only
    // with no match is a placeholder created.
    const lookupQuery = new URLSearchParams({
      "filter[school_name][_icontains]": schoolName,
      fields:
        "school_id,school_name,city_municipality,province,school_status,verification_status,is_active",
      sort: "school_name,school_id",
      limit: "50",
    });
    const lookupRes = await fetch(`${base}/items/vs_school?${lookupQuery.toString()}`, {
      headers: directusHeaders(),
      cache: "no-store",
    });
    if (!lookupRes.ok) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }
    const lookupJson = (await lookupRes.json()) as unknown;
    const lookupRows = z
      .object({ data: z.array(placeholderRowSchema) })
      .parse(lookupJson).data;
    const exact = lookupRows.filter(
      (row) =>
        normalizeKey(row.school_name) === normalizeKey(schoolName) &&
        normalizeKey(row.city_municipality) === normalizeKey(city) &&
        normalizeKey(row.province) === normalizeKey(province)
    );

    const toCandidate = async (
      row: z.infer<typeof placeholderRowSchema>
    ): Promise<z.infer<typeof schoolRouteCandidateSchema> | null> => {
      const adminQuery = new URLSearchParams({
        "filter[school_id][_eq]": String(row.school_id),
        "filter[is_active][_eq]": "1",
        fields: "school_id,is_active",
        limit: "1",
      });
      const adminRes = await fetch(
        `${base}/items/vs_school_admin?${adminQuery.toString()}`,
        { headers: directusHeaders(), cache: "no-store" }
      );
      if (!adminRes.ok) return null;
      const adminJson = (await adminRes.json()) as unknown;
      const admins = z
        .object({ data: z.array(placeholderAdminRowSchema) })
        .parse(adminJson).data;
      const hasActiveAdmin = admins.some(
        (admin) => admin.is_active === true || admin.is_active === 1
      );
      const route = classifySearchRow(row, hasActiveAdmin);
      if (route === null) return null;
      return schoolRouteCandidateSchema.parse({
        school_id: row.school_id,
        school_name: row.school_name,
        city_municipality: row.city_municipality,
        province: row.province,
        school_status: row.school_status,
        verification_route: route,
      });
    };

    if (exact.length > 1) {
      return NextResponse.json(
        {
          error:
            "Multiple schools match this identity. Resolve the ambiguity in VOS before creating a placeholder.",
        },
        { status: 409 }
      );
    }
    if (exact.length === 1) {
      const only = exact[0] as z.infer<typeof placeholderRowSchema>;
      const candidate = await toCandidate(only);
      if (candidate === null) {
        return NextResponse.json(
          {
            error:
              "The matching school is not selectable. Resolve it in VOS before proceeding.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ school: candidate, reused: true });
    }

    // No normalized match: create exactly one Draft placeholder row.
    // school_status 'Draft' + verification_status 'DRAFT' with NO
    // vs_school_admin link is the placeholder identity (spec: Placeholder
    // creation and ownership). is_active is set so the row classifies as
    // AWAITING_REGISTRATION; created_by records the VOS Admin actor.
    const createRes = await fetch(`${base}/items/vs_school`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify({
        school_name: schoolName,
        city_municipality: city,
        province,
        school_status: "Draft",
        verification_status: "DRAFT",
        is_active: true,
        profile_completion_percent: 0,
        created_by: auth.adminId,
      }),
    });
    const createJson = (await createRes.json()) as unknown;
    if (!createRes.ok) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }
    const created = z.object({ data: placeholderRowSchema }).parse(createJson).data;
    const candidate = await toCandidate(created);
    if (candidate === null) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }
    return NextResponse.json({ school: candidate, reused: false }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const [firstIssue] = error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid school data." },
        { status: 400 }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }
}
