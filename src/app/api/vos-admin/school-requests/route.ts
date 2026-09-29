import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { z } from "zod";
import { getSchoolRequests } from "@/modules/vos-admin/request-management";

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

// Plan 2 Todo 4: the school-request LIST status filter is exactly
// 'ALL' | RequestStatus (FOUR statuses). Line 133 (Final contract override)
// supersedes any five-status/SchoolRequestStatus wording elsewhere.
const listStatusSchema = z.enum([
  "ALL",
  "Pending",
  "Approved",
  "Rejected",
  "RoutedToSchool",
]);


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
    const statusResult = listStatusSchema.safeParse(
      searchParams.get("status") || "ALL"
    );
    if (!statusResult.success) {
      const [firstIssue] = statusResult.error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Unknown list status." },
        { status: 400 }
      );
    }

    const requests = await getSchoolRequests(statusResult.data);
    return NextResponse.json({ requests });
  } catch {
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }
}
