// src/app/api/shared/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || req.cookies.get("vos_access_token")?.value;
    const callerId = token ? getUserIdFromToken(token) : null;
    
    let callerRole = 0; // Default unknown

    // Fetch caller role if we have an ID
    if (callerId) {
      const callerRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${callerId}?fields=role_id`, {
        headers: getHeaders(),
      });
      if (callerRes.ok) {
        const callerJson = await callerRes.json();
        callerRole = callerJson.data?.role_id || 0;
      }
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Use REST API to bypass strict GraphQL relational alias constraints
    const url = new URL(`${DIRECTUS_BASE}/items/vs_user`);
    url.searchParams.append("limit", "10");
    url.searchParams.append("filter[_and][0][role_id][_in]", "1,2");
    url.searchParams.append("filter[_and][1][_or][0][user_fname][_icontains]", query);
    url.searchParams.append("filter[_and][1][_or][1][user_lname][_icontains]", query);
    url.searchParams.append("fields", "user_id,user_fname,user_lname,user_email,role_id,job_seeker_profile.*,vs_job_seeker_profile.*");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Directus search error:", errText);
      return NextResponse.json({ error: "Failed to fetch users", details: errText }, { status: 500 });
    }

    const json = await res.json();
    const users = json.data || [];

    // Filter based on role and visibility
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const filteredUsers = users.filter((u: any) => {
      // Must be freelancer or client
      if (u.role_id !== 1 && u.role_id !== 2) return false;
      
      // If Freelancer
      if (u.role_id === 1) {
        const rawProfiles = u.job_seeker_profile || u.vs_job_seeker_profile || [];
        const profiles = Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles];
        const profile = profiles[0];
        if (!profile) return false;

        const vis = (profile.profile_visibility || "").toLowerCase();
        if (vis === "public") return true;
        if (vis === "recruiters only") {
          return callerRole === 2; // only clients can see
        }
        return false;
      }
      
      // If Client
      return u.role_id === 2;
    });

    const publicUsers = filteredUsers.map((u: any) => {
      let headline = "";
      const rawProfiles = u.job_seeker_profile || u.vs_job_seeker_profile || [];
      const profiles = Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles];
      
      if (u.role_id === 1) {
        headline = profiles[0]?.professional_headline || "Freelancer";
      } else if (u.role_id === 2) {
        headline = "Client";
      }

      return {
        user_id: u.user_id,
        user_fname: u.user_fname,
        user_lname: u.user_lname,
        user_email: u.user_email,
        role_id: u.role_id,
        headline,
      };
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({ results: publicUsers });
  } catch (err: unknown) {
    console.error("GET /api/shared/users/search error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
