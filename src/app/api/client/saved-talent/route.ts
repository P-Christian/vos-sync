// src/app/api/client/saved-talent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { getPHTimeString } from "@/lib/utils";

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

// GET — list all saved talents for this company
export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = Number(session.userId);
    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json({ error: `Company not verified: ${verification_status}`, saved: [] }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ saved: [] });
    }

    const savedRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_saved_applicant?filter[company_id][_eq]=${companyId}&fields=saved_applicant_id,applicant_user_id,notes,created_at&sort[]=-created_at&limit=-1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!savedRes.ok) {
      return NextResponse.json({ error: "Failed to fetch saved talent." }, { status: 502 });
    }

    const savedJson = await savedRes.json();
    const savedRows: Array<{ saved_applicant_id: number; applicant_user_id: number; notes?: string; created_at?: string }> =
      savedJson.data ?? [];

    if (savedRows.length === 0) {
      return NextResponse.json({ saved: [] });
    }

    const userIds = savedRows.map((s) => s.applicant_user_id);

    // Fetch basic user info + profile
    const [usersRes, profilesRes, skillsRes] = await Promise.all([
      fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,profile_image_url,user_city,user_province&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,profile_headline&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
      fetch(
        `${DIRECTUS_BASE}/items/vs_user_skills_map?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,skill_id.skill_name&limit=-1`,
        { headers: getHeaders(), cache: "no-store" }
      ),
    ]);

    const users: Array<{ user_id: number; user_fname: string; user_lname: string; user_email: string; profile_image_url?: string; user_city?: string; user_province?: string }> =
      usersRes.ok ? (await usersRes.json()).data ?? [] : [];

    const profiles: Array<{ user_id: number; profile_headline?: string }> =
      profilesRes.ok ? (await profilesRes.json()).data ?? [] : [];

    const skillRows: Array<{ user_id: number; skill_id?: { skill_name?: string } }> =
      skillsRes.ok ? (await skillsRes.json()).data ?? [] : [];

    const usersMap = new Map(users.map((u) => [u.user_id, u]));
    const profilesMap = new Map(profiles.map((p) => [p.user_id, p]));
    const skillsMap = new Map<number, string[]>();
    for (const row of skillRows) {
      const name = row.skill_id?.skill_name;
      if (!name) continue;
      if (!skillsMap.has(row.user_id)) skillsMap.set(row.user_id, []);
      skillsMap.get(row.user_id)!.push(name);
    }

    const saved = savedRows.map((s) => {
      const user = usersMap.get(s.applicant_user_id);
      const profile = profilesMap.get(s.applicant_user_id);
      return {
        id: s.saved_applicant_id,
        talent_user_id: s.applicant_user_id,
        folder_name: "Default",
        notes: s.notes ?? null,
        created_at: s.created_at ?? null,
        name: user ? `${user.user_fname} ${user.user_lname}`.trim() : `Talent #${s.applicant_user_id}`,
        email: user?.user_email ?? null,
        profile_image_url: user?.profile_image_url ?? null,
        location: [user?.user_city, user?.user_province].filter(Boolean).join(", ") || null,
        headline: profile?.profile_headline ?? null,
        skills: skillsMap.get(s.applicant_user_id) ?? [],
      };
    });

    return NextResponse.json({ saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[saved-talent GET] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — save a talent
export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = Number(session.userId);
    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json({ error: `Company not verified: ${verification_status}` }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const body = await req.json();
    const { talent_user_id, notes } = body;

    const talentUserIdNum = Number(talent_user_id);
    if (!talentUserIdNum || isNaN(talentUserIdNum)) {
      return NextResponse.json({ error: "Valid talent_user_id is required." }, { status: 400 });
    }

    // Check if already saved
    const existingRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_saved_applicant?filter[company_id][_eq]=${companyId}&filter[applicant_user_id][_eq]=${talentUserIdNum}&fields=saved_applicant_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (existingRes.ok) {
      const existingJson = await existingRes.json();
      if (existingJson.data?.length > 0) {
        return NextResponse.json({ error: "Talent already saved.", already_saved: true }, { status: 409 });
      }
    }

    const nowPH = getPHTimeString();
    const sanitizedNotes = typeof notes === "string" ? notes.trim().slice(0, 1000) : null;

    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_saved_applicant`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        company_id: companyId,
        applicant_user_id: talentUserIdNum,
        notes: sanitizedNotes,
        created_by: userId,
        created_at: nowPH,
        updated_at: nowPH,
      }),
    });

    if (!createRes.ok) {
      console.error("[saved-talent POST] Failed to save talent in Directus:", await createRes.text());
      return NextResponse.json({ error: "Failed to save talent." }, { status: 502 });
    }

    const created = (await createRes.json()).data;
    return NextResponse.json({ success: true, saved: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("[saved-talent POST] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

