import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  CourseRequestDecisionError,
  getCourseRequestCandidates,
} from "@/modules/vos-admin/request-management";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: paramId } = await params;
    const id = parseInt(paramId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Candidates come from the request's persisted school. Query parameters
    // are never consulted, so no school override is possible.
    const result = await getCourseRequestCandidates(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof CourseRequestDecisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Course catalog storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
