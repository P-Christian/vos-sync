// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const COOKIE_NAME = "vos_access_token";
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    const userRoleId = Number(payload.role_id);
    const userRoleName =
      typeof payload.role_name === "string"
        ? payload.role_name
        : typeof payload.role === "string"
        ? payload.role
        : "";
    const roleUpper = userRoleName.toUpperCase();

    let role = "employee";
    let dashboard = "/vos-sync/freelancer/dashboard";

    if (userRoleId === 2 || roleUpper === "CLIENT" || roleUpper === "EMPLOYER") {
      role = "employer";
      dashboard = "/vos-sync/client/dashboard";
    } else if (userRoleId === 3 || roleUpper === "ADMIN") {
      role = "admin";
      dashboard = "/vos-sync/vos-admin";
    } else if (userRoleId === 4 || roleUpper === "SCHOOL_ADMIN" || roleUpper === "SCHOOL") {
      role = "school";
      dashboard = "/vos-sync/school-admin";
    }

    return NextResponse.json({
      authenticated: true,
      role,
      dashboard,
      userId: payload.user_id || payload.sub || null,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
