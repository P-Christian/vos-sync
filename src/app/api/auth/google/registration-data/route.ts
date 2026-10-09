// src/app/api/auth/google/registration-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  decryptGoogleRegistration,
  getUserIdentityBySubject,
} from "@/modules/auth/google/google.service";
import { getUserByEmail } from "@/modules/auth/services/auth.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const regCookie = req.cookies.get("vos_sync_google_reg")?.value;

  if (!regCookie) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const payload = await decryptGoogleRegistration(regCookie);
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Re-check server-side uniqueness to prevent onboarding bypass
  const [existingUser, existingIdentity] = await Promise.all([
    getUserByEmail(payload.email),
    getUserIdentityBySubject("google", payload.sub),
  ]);

  if (existingUser || existingIdentity) {
    return NextResponse.json(
      { ok: false, error: "An account is already associated with this Google identity." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      email: payload.email,
      given_name: payload.given_name || "",
      family_name: payload.family_name || "",
      name: payload.name || "",
      picture: payload.picture || "",
    },
  });
}
