// src/app/api/auth/google/cancel-link/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isHttps = req.nextUrl.protocol === "https:";
  const res = NextResponse.json({ ok: true, message: "Pending link discarded." });

  res.cookies.set({
    name: "vos_sync_pending_google_link",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 0,
  });

  return res;
}
