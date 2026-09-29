import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ZodError } from "zod";
import {
  CourseRequestDecisionError,
  reviewCourseRequest,
  reviewCourseRequestSchema,
} from "@/modules/vos-admin/request-management";
import { EducationFlowUnavailableError } from "@/modules/education-verification";

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

export async function PATCH(
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

    const body = await req.json();
    const parsed = reviewCourseRequestSchema.parse(body);

    const request = await reviewCourseRequest(id, parsed, auth.adminId, {
      roleId: auth.roleId,
    });
    return NextResponse.json({ request });
  } catch (error: unknown) {
    if (error instanceof EducationFlowUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }
    if (error instanceof CourseRequestDecisionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      const [firstIssue] = error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Malformed decision body." },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Malformed decision body." },
        { status: 400 }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Course request storage is temporarily unavailable." },
      { status: 503 }
    );
  }
}
