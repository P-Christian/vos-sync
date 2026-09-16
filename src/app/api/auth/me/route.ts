// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import {
  canAuthenticate,
  getAccountAuthenticationState,
} from "@/lib/status-validator";
import { getJwtVerificationSecret } from "@/modules/auth/registration/registration.session";

const COOKIE_NAME = "vos_access_token";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const secret = getJwtVerificationSecret();
    const { payload } = await jose.jwtVerify(token, secret);

    const userId = payload.user_id || payload.sub;
    if (typeof userId !== "string" && typeof userId !== "number") {
      return NextResponse.json({ authenticated: false });
    }
    const currentUser = await getAccountAuthenticationState(userId);
    if (!canAuthenticate(currentUser)) {
      const response = NextResponse.json({ authenticated: false });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    const userRoleId = Number(currentUser?.role_id);
    const userRoleName =
      typeof currentUser?.role_name === "string"
        ? currentUser.role_name
        : typeof currentUser?.role === "string"
        ? currentUser.role
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
    } else if (userRoleId === 4 || roleUpper === "SCHOOL_ADMIN" || roleUpper === "SCH_ADMIN" || roleUpper === "SCHOOL") {
      role = "school";
      dashboard = "/vos-sync/school-admin";
    }

    return NextResponse.json({
      authenticated: true,
      role,
      dashboard,
      userId,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
