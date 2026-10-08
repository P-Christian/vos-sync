// src/app/api/client/talent-invitation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { getPHTimeString } from "@/lib/utils";
import { createSystemMessage } from "@/lib/messaging/system-message";
import { sendInvitationEmail } from "@/lib/mail/services/job-mail";
import { isEmailEnabledForUser } from "@/lib/mail/preference-check";
import { isInAppEnabledForUser } from "@/lib/notifications/preference-check";

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

// POST — send a talent invitation
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
    const { talent_user_id, job_id, message, subject } = body;

    const candidateUserId = Number(talent_user_id);
    if (!candidateUserId || isNaN(candidateUserId) || candidateUserId <= 0) {
      return NextResponse.json({ error: "A valid talent_user_id is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "A message is required for the invitation." }, { status: 400 });
    }

    // Input bounds enforcement
    const trimmedMessage = message.trim().slice(0, 2000);
    const trimmedSubject = subject && typeof subject === "string" ? subject.trim().slice(0, 200) : null;

    // Strict Multi-Tenant IDOR Ownership Gate on Job Posting
    let verifiedJob: Record<string, unknown> | null = null;
    if (job_id) {
      const jobIdNum = Number(job_id);
      if (isNaN(jobIdNum) || jobIdNum <= 0) {
        return NextResponse.json({ error: "Invalid job_id provided." }, { status: 400 });
      }

      const jobVerifyUrl = `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_eq]=${jobIdNum}&filter[company_id][_eq]=${companyId}&fields=job_id,job_title,job_description,job_location,work_arrangement,job_type,salary_min,salary_max,currency&limit=1`;
      const jobVerifyRes = await fetch(jobVerifyUrl, { headers: getHeaders(), cache: "no-store" });
      if (!jobVerifyRes.ok) {
        return NextResponse.json({ error: "Failed to verify job ownership." }, { status: 502 });
      }
      const jobVerifyJson = await jobVerifyRes.json();
      verifiedJob = jobVerifyJson.data?.[0] ?? null;

      if (!verifiedJob) {
        return NextResponse.json(
          { error: "Forbidden: Job posting not found or does not belong to your company." },
          { status: 403 }
        );
      }
    }

    const nowPH = getPHTimeString();

    // 1. Create invitation record
    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_applicant_invitation`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        company_id: companyId,
        applicant_user_id: candidateUserId,
        job_id: verifiedJob ? Number(verifiedJob.job_id) : null,
        subject: trimmedSubject,
        message: trimmedMessage,
        status: "PENDING",
        created_by: userId,
        created_at: nowPH,
        updated_at: nowPH,
      }),
    });

    if (!createRes.ok) {
      console.error("[talent-invitation POST] Failed to insert invitation:", await createRes.text());
      return NextResponse.json({ error: "Failed to send invitation." }, { status: 502 });
    }

    const created = (await createRes.json()).data;

    // 2. Fetch candidate & company details to dispatch notifications
    const [candRes, compRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_user/${candidateUserId}?fields=user_email,user_fname,user_lname`, {
        headers: getHeaders(),
        cache: "no-store",
      }),
      fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=company_name`, {
        headers: getHeaders(),
        cache: "no-store",
      }),
    ]);

    const candidate = candRes.ok ? (await candRes.json()).data : null;
    const company = compRes.ok ? (await compRes.json()).data : null;

    const companyName = (company?.company_name as string) || "a company on VOS-Sync";
    const jobTitle = (verifiedJob?.job_title as string) || null;
    const jobDescription = (verifiedJob?.job_description as string) || null;
    const jobLocation = (verifiedJob?.job_location as string) || null;
    const workArrangement = (verifiedJob?.work_arrangement as string) || null;
    const jobType = (verifiedJob?.job_type as string) || null;

    let salaryRange: string | null = null;
    if (verifiedJob && (verifiedJob.salary_min || verifiedJob.salary_max)) {
      const curr = (verifiedJob.currency as string) || "PHP";
      const minStr = verifiedJob.salary_min ? Number(verifiedJob.salary_min).toLocaleString() : null;
      const maxStr = verifiedJob.salary_max ? Number(verifiedJob.salary_max).toLocaleString() : null;
      if (minStr && maxStr) {
        salaryRange = `${curr} ${minStr} - ${maxStr}`;
      } else if (minStr) {
        salaryRange = `${curr} ${minStr}+`;
      } else if (maxStr) {
        salaryRange = `Up to ${curr} ${maxStr}`;
      }
    }

    // 3. Dispatch In-App Message (if user preference allows)
    const canSendInApp = await isInAppEnabledForUser(candidateUserId, "INVITATION_RECEIVED");
    if (canSendInApp) {
      await createSystemMessage({
        clientId: companyId,
        freelancerId: candidateUserId,
        jobId: verifiedJob ? Number(verifiedJob.job_id) : null,
        text: trimmedMessage,
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
        message: trimmedMessage,
      }).catch((e) =>
        console.error("Failed to send notification email:", e)
      );
    }

    return NextResponse.json({ success: true, invitation: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("[talent-invitation POST] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// GET — list sent invitations for this company
export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = Number(session.userId);
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
    console.error("[talent-invitation GET] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

