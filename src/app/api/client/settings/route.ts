// src/app/api/client/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8")
    );
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

// ─── GET — Fetch user profile info ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_user/${userId}?fields=user_id,user_email,user_fname,user_mname,user_lname,user_contact,user_position,user_department,profile_image_url,role`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Directus fetch user error:", text);
      return NextResponse.json(
        { error: "Failed to fetch user profile." },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json({ user: json.data });
  } catch (err: unknown) {
    console.error("GET /api/client/settings error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH — Update user profile or change password ───────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type;
    const payload = body?.payload;

    if (type === "PROFILE") {
      const updateData = {
        user_fname: payload?.user_fname,
        user_mname: payload?.user_mname,
        user_lname: payload?.user_lname,
        user_contact: payload?.user_contact,
        user_position: payload?.user_position,
      };

      const res = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Directus update profile error:", text);
        return NextResponse.json(
          { error: "Failed to update profile." },
          { status: res.status }
        );
      }

      const json = await res.json();
      return NextResponse.json({ user: json.data });
    }

    if (type === "PASSWORD") {
      const currentPassword = String(payload?.current_password ?? "").trim();
      const newPassword = String(payload?.new_password ?? "").trim();

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Current password and new password are required." },
          { status: 400 }
        );
      }

      // Fetch stored password hash
      const userRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user/${userId}?fields=user_id,user_password,hash_password`,
        { headers: getHeaders(), cache: "no-store" }
      );

      if (!userRes.ok) {
        return NextResponse.json(
          { error: "Failed to verify account credentials." },
          { status: 500 }
        );
      }

      const userJson = await userRes.json();
      const storedUser = userJson.data;
      const storedHash = storedUser?.hash_password || storedUser?.user_password;

      if (storedHash) {
        const matches = await bcrypt.compare(currentPassword, storedHash);
        if (!matches) {
          return NextResponse.json(
            { error: "Current password is incorrect." },
            { status: 400 }
          );
        }
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          hash_password: newHash,
          user_password: newHash,
        }),
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error("Directus update password error:", text);
        return NextResponse.json(
          { error: "Failed to update password." },
          { status: patchRes.status }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action type." }, { status: 400 });
  } catch (err: unknown) {
    console.error("PATCH /api/client/settings error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
