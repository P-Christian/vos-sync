// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import {
  canAuthenticate,
  getAccountAuthenticationState,
} from "@/lib/status-validator";
import { getJwtVerificationSecret } from "@/modules/auth/registration/registration.session";

const COOKIE_NAME = "vos_sync_access_token";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || ""
).replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getDirectusHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

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

    let companyId: number | null = null;
    let companyCode: string | null = null;

    if (role === "employer") {
      try {
        const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`;
        const linkRes = await fetch(linkUrl, { headers: getDirectusHeaders(), next: { revalidate: 10 } });
        if (linkRes.ok) {
          const linkJson = await linkRes.json();
          const rawComp = linkJson.data?.[0]?.company_id;
          const resolvedCompId =
            typeof rawComp === "object" && rawComp !== null
              ? rawComp.company_id
              : rawComp;

          if (resolvedCompId) {
            companyId = Number(resolvedCompId);
            const compRes = await fetch(
              `${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=company_id,company_code`,
              { headers: getDirectusHeaders(), next: { revalidate: 10 } }
            );
            if (compRes.ok) {
              const compJson = await compRes.json();
              companyCode = compJson.data?.company_code || null;
            }
          }
        }
      } catch (err) {
        console.error("[auth/me] Error fetching employer company:", err);
      }
    }

    return NextResponse.json({
      authenticated: true,
      role,
      dashboard,
      userId,
      companyId,
      companyCode,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
