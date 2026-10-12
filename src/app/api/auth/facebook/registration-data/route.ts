// src/app/api/auth/facebook/registration-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { decryptFacebookRegistration } from "@/modules/auth/facebook/facebook.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const regCookie = req.cookies.get("vos_sync_facebook_reg")?.value;

  if (!regCookie) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const payload = await decryptFacebookRegistration(regCookie);
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      email: payload.email,
      name: payload.name || "",
      given_name: payload.first_name || "",
      family_name: payload.last_name || "",
      picture: payload.picture || "",
    },
  });
}
