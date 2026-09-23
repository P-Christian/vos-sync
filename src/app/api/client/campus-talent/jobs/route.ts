// src/app/api/client/campus-talent/jobs/route.ts
// GET: Returns the authenticated recruiter's company active job postings
// for the job selector in the Campus Talent match interface.

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
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
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified || !companyId) {
      return NextResponse.json(
        { error: `Restricted: Company status is ${verification_status}.` },
        { status: 403 }
      );
    }

    const fields = [
      "job_id",
      "job_title",
      "job_type",
      "job_category",
      "experience_level",
      "education",
      "job_qualifications",
      "job_responsibilities",
      "status",
    ].join(",");

    const url = `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${companyId}&filter[status][_eq]=ACTIVE&fields=${fields}&sort[]=job_title&limit=100`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch jobs.");

    const json = await res.json();
    const jobs = (json.data ?? []) as Array<Record<string, unknown>>;

    // For each job, fetch the required/optional skills from vs_job_skills_map
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobId = job.job_id as number;
        const skillsRes = await fetch(
          `${DIRECTUS_BASE}/items/vs_job_skills_map?filter[job_id][_eq]=${jobId}&fields=skill_id.skill_name,skill_id.id&limit=50`,
          { headers: getHeaders(), cache: "no-store" }
        );
        let skills: Array<{ skill_name: string; is_required: number }> = [];
        if (skillsRes.ok) {
          const rawSkills = ((await skillsRes.json()).data ?? []) as Array<{ skill_id: { skill_name: string } }>;
          // vs_job_skills_map does not have an is_required column — default all to PREFERRED
          skills = rawSkills.map((s) => ({ skill_name: s.skill_id?.skill_name ?? "", is_required: 0 }));
        }
        return { ...job, skills };
      })
    );

    return NextResponse.json({ data: enrichedJobs, total: enrichedJobs.length, companyId });
  } catch (err: unknown) {
    console.error("[campus-talent/jobs GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
