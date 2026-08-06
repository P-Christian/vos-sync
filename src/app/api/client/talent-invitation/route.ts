// src/app/api/client/talent-invitation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";

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
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

import { createSystemMessage } from "@/lib/messaging/system-message";
import { sendInvitationEmail } from "@/lib/mail/services/job-mail";
import { isEmailEnabledForUser } from "@/lib/mail/preference-check";
import { isInAppEnabledForUser } from "@/lib/notifications/preference-check";

// POST — send a talent invitation
export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { isVerified, verification_status, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified) {
      return NextResponse.json({ error: `Company not verified: ${verification_status}` }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const body = await req.json();
    const { talent_user_id, job_id, message } = body;

    if (!talent_user_id) {
      return NextResponse.json({ error: "talent_user_id is required." }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "A message is required for the invitation." }, { status: 400 });
    }

    // Add UTC+8 for PH timezone
    const nowUTC8 = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace("Z", "");

    // 1. Create invitation record
    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_applicant_invitation`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        company_id: companyId,
        applicant_user_id: Number(talent_user_id),
        job_id: job_id ? Number(job_id) : null,
        subject: body.subject || null,
        message: message.trim(),
        status: "PENDING",
        created_by: userId,
        created_at: nowUTC8,
        updated_at: nowUTC8,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Failed to send invitation: ${errText}` }, { status: 502 });
    }

    const created = (await createRes.json()).data;

    // 2. Fetch candidate & job details to send email and in-app message
    const [candRes, compRes, jobRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_user/${talent_user_id}?fields=user_email,user_fname,user_lname`, {
        headers: getHeaders(),
        cache: "no-store",
      }),
      fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=company_name`, {
        headers: getHeaders(),
        cache: "no-store",
      }),
      job_id
        ? fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${job_id}?fields=job_title,job_description,job_location,work_arrangement,job_type,salary_min,salary_max,currency`, {
            headers: getHeaders(),
            cache: "no-store",
          })
        : Promise.resolve(null),
    ]);

    const candidate = candRes.ok ? (await candRes.json()).data : null;
    const company = compRes.ok ? (await compRes.json()).data : null;
    const job = jobRes && jobRes.ok ? (await jobRes.json()).data : null;

    const companyName = company?.company_name || "a company on VOS-Sync";
    const jobTitle = job?.job_title || null;
    const jobDescription = job?.job_description || null;
    const jobLocation = job?.job_location || null;
    const workArrangement = job?.work_arrangement || null;
    const jobType = job?.job_type || null;

    let salaryRange: string | null = null;
    if (job?.salary_min || job?.salary_max) {
      const curr = job.currency || "PHP";
      const minStr = job.salary_min ? Number(job.salary_min).toLocaleString() : null;
      const maxStr = job.salary_max ? Number(job.salary_max).toLocaleString() : null;
      if (minStr && maxStr) {
        salaryRange = `${curr} ${minStr} - ${maxStr}`;
      } else if (minStr) {
        salaryRange = `${curr} ${minStr}+`;
      } else if (maxStr) {
        salaryRange = `Up to ${curr} ${maxStr}`;
      }
    }

    const candidateUserId = Number(talent_user_id);

    // 3. Dispatch In-App Message (if user preference allows)
    const canSendInApp = await isInAppEnabledForUser(candidateUserId, "INVITATION_RECEIVED");
    if (canSendInApp) {
      await createSystemMessage({
        clientId: companyId,
        freelancerId: candidateUserId,
        jobId: job_id ? Number(job_id) : null,
        text: message.trim(),
        senderId: userId,
      }).catch((e) => console.error("Failed to create in-app message:", e));
    }

    // 4. Dispatch Email Notification (if user preference allows)
    const canSendEmail = await isEmailEnabledForUser(candidateUserId, "INVITATION_RECEIVED");
    if (candidate?.user_email && canSendEmail) {
      const candidateName = [candidate.user_fname, candidate.user_lname].filter(Boolean).join(" ");
      await sendInvitationEmail(candidate.user_email, {
        candidateName,
        companyName,
        jobTitle,
        jobDescription,
        jobLocation,
        workArrangement,
        jobType,
        salaryRange,
        message: message.trim(),
      }).catch((e) =>
        console.error("Failed to send notification email:", e)
      );
    }

    return NextResponse.json({ success: true, invitation: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[talent-invitation POST] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — list sent invitations for this company
export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { isVerified, companyId } = await checkCompanyVerificationStatus(userId);
    if (!isVerified || !companyId) {
      return NextResponse.json({ invitations: [] }, { status: 200 });
    }

    const invRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_applicant_invitation?filter[company_id][_eq]=${companyId}&fields=invitation_id,applicant_user_id,job_id,subject,message,status,created_at&sort[]=-created_at&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!invRes.ok) {
      return NextResponse.json({ error: "Failed to fetch invitations." }, { status: 502 });
    }

    const invJson = await invRes.json();
    return NextResponse.json({ invitations: invJson.data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[talent-invitation GET] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
