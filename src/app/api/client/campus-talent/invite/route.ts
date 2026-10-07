// src/app/api/client/campus-talent/invite/route.ts
// POST: Sends a campus recruitment invitation to a student.
//
// 2-step non-transactional pattern (email ≠ ACID transaction):
//   1. Create vs_campus_talent_invitation record with status = PENDING
//   2. Attempt sendMail()
//   3. Update record to SENT or FAILED
//   4. Only update vs_school_student.invitation_status to "Invited" after SENT
//
// This is the authoritative pattern — email is a side effect, not a transaction participant.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { checkCompanyVerificationStatus } from "@/lib/status-validator";
import { transporter, MAIL_FROM } from "@/lib/mail/transporter";
import { CampusInvitationPayload } from "@/modules/matching-engine/campus/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vossync.com";
const INVITATION_EXPIRES_DAYS = 30;

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

function getPHDateTime(date: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return dtf.format(date).replace(" ", "T");
}

async function findActiveStudentInvitation(
  studentId: number,
  schoolId?: number | null
): Promise<{ invitation_id: number; token: string; expires_at: string } | null> {
  const schoolFilter = schoolId ? `&filter[school_id][_eq]=${schoolId}` : "";
  const res = await fetch(
    `${DIRECTUS_BASE}/items/vs_student_invitation?filter[student_id][_eq]=${studentId}${schoolFilter}&filter[is_used][_eq]=0&sort[]=-created_at&limit=1`,
    { headers: getHeaders(), cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0] || null;
}

async function createStudentInvitation(
  studentId: number,
  schoolId: number,
  token: string,
  expiresAt: string,
  createdAt: string
): Promise<{ invitation_id: number; token: string; expires_at: string } | null> {
  const res = await fetch(`${DIRECTUS_BASE}/items/vs_student_invitation`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      student_id: studentId,
      school_id: schoolId,
      token,
      expires_at: expiresAt,
      is_used: 0,
      created_at: createdAt,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[campus-talent/invite] createStudentInvitation error:", errText);
    return null;
  }
  const json = await res.json();
  return json.data ?? null;
}

async function updateStudentInvitationStatus(
  studentId: number,
  status: "Invited",
  invitedAt: string
): Promise<void> {
  await fetch(`${DIRECTUS_BASE}/items/vs_school_student/${studentId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      invitation_status: status,
      invited_at: invitedAt,
    }),
  });
}

function buildInvitationHtml(
  payload: CampusInvitationPayload,
  actionLink: string,
  isRegisteredUser: boolean
): string {
  const studentName = `${payload.recipientName}`;
  const companyName = payload.companyName || "A partner employer";
  const schoolText = payload.schoolName ? ` at <strong>${payload.schoolName}</strong>` : "";

  if (payload.jobTitle) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Career Opportunity — ${payload.jobTitle}</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 32px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px; border: 1px solid #e5e7eb;">
    <h2 style="color: #1e293b; margin-top: 0;">You have been invited to apply!</h2>
    <p style="color: #475569;">Hello <strong>${studentName}</strong>,</p>
    <p style="color: #475569;">
      <strong>${companyName}</strong> has reviewed your academic profile${schoolText}
      and would like to invite you to apply for the following role:
    </p>
    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <strong style="color: #0c4a6e;">${payload.jobTitle}</strong>
      ${payload.courseName ? `<p style="margin: 4px 0; color: #475569; font-size: 14px;">Matched to your program: ${payload.courseName}</p>` : ""}
    </div>
    <p style="color: #475569;">${isRegisteredUser ? "Click the button below to view the job posting:" : "Click the button below to register on VOS Sync and view the full opportunity:"}</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionLink}"
         style="background: #0ea5e9; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
        ${isRegisteredUser ? "View Opportunity" : "Register & View Opportunity"}
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
      This invitation was sent to ${payload.recipientEmail}. If you believe you received this in error, you may ignore this email.
    </p>
  </div>
</body>
</html>`;
  }

  // General platform registration invitation
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invitation to Connect on VOS Sync</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 32px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px; border: 1px solid #e5e7eb;">
    <h2 style="color: #1e293b; margin-top: 0;">Connect with ${companyName} on VOS Sync!</h2>
    <p style="color: #475569;">Hello <strong>${studentName}</strong>,</p>
    <p style="color: #475569;">
      <strong>${companyName}</strong> has discovered your academic profile${schoolText} on VOS Sync and invites you to join the talent network.
    </p>
    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <strong style="color: #0c4a6e;">Campus Talent Network</strong>
      <p style="margin: 4px 0; color: #475569; font-size: 14px;">Register your verified student profile to connect with hiring teams, showcase your projects, and access career opportunities.</p>
    </div>
    <p style="color: #475569;">Click the button below to register your account on VOS Sync:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionLink}"
         style="background: #0ea5e9; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
        Register on VOS Sync
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
      This invitation expires in ${INVITATION_EXPIRES_DAYS} days. If you believe you received this in error, you may ignore this email.
    </p>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_sync_access_token")?.value;

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

    const body = (await req.json()) as CampusInvitationPayload;
    const { studentId, jobId, recipientEmail, recipientName, schoolName } = body;
    let { schoolId, courseName, jobTitle, companyName } = body;

    if (!studentId || !recipientEmail || !recipientName) {
      return NextResponse.json({ error: "Missing required invitation fields." }, { status: 400 });
    }

    // Resolve company name if not supplied
    if (!companyName && companyId) {
      try {
        const cRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=company_name`, { headers: getHeaders() });
        if (cRes.ok) {
          const cData = await cRes.json();
          companyName = cData.data?.company_name || "";
        }
      } catch {
        // non-blocking fallback
      }
    }

    // Auto-resolve schoolId, courseName and registered_user_id
    let registeredUserId: number | null = null;
    try {
      const sRes = await fetch(`${DIRECTUS_BASE}/items/vs_school_student/${studentId}?fields=school_id,course_name,registered_user_id`, { headers: getHeaders() });
      if (sRes.ok) {
        const sData = await sRes.json();
        if (!schoolId) schoolId = sData.data?.school_id || 0;
        if (!courseName) courseName = sData.data?.course_name;
        if (sData.data?.registered_user_id) {
          registeredUserId = Number(sData.data.registered_user_id);
        }
      }
    } catch {
      // non-blocking fallback
    }

    // Auto-resolve jobTitle if jobId passed but title missing
    if (jobId && !jobTitle) {
      try {
        const jRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${jobId}?fields=job_title`, { headers: getHeaders() });
        if (jRes.ok) {
          const jData = await jRes.json();
          jobTitle = jData.data?.job_title || "";
        }
      } catch {
        // non-blocking fallback
      }
    }

    // Normalize empty strings/0 to null
    const safeJobId = jobId && Number(jobId) > 0 ? Number(jobId) : null;
    const safeJobTitle = safeJobId ? jobTitle?.trim() || null : null;

    const nowPH = getPHDateTime();
    const expiresDate = new Date(Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    const expiresAt = getPHDateTime(expiresDate);

    let actionLink = "";
    let invitationId: number | null = null;

    if (!registeredUserId) {
      // Unregistered student -> Issue vs_student_invitation token for /student-register
      const existingInvitation = await findActiveStudentInvitation(studentId, schoolId);
      let inviteToken = "";
      if (existingInvitation) {
        inviteToken = existingInvitation.token;
        invitationId = existingInvitation.invitation_id;
      } else {
        inviteToken = randomBytes(32).toString("hex");
        const createdRecord = await createStudentInvitation(
          studentId,
          schoolId || 0,
          inviteToken,
          expiresAt,
          nowPH
        );
        if (!createdRecord) {
          return NextResponse.json({ error: "Failed to create invitation record." }, { status: 500 });
        }
        invitationId = createdRecord.invitation_id;
      }
      actionLink = `${APP_URL}/student-register?token=${inviteToken}`;
    } else {
      // Already registered student -> Direct to job application or portal
      actionLink = safeJobId ? `${APP_URL}/jobs/${safeJobId}` : `${APP_URL}/dashboard`;

      if (safeJobId) {
        try {
          const appInvRes = await fetch(`${DIRECTUS_BASE}/items/vs_applicant_invitation`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              company_id: companyId,
              applicant_user_id: registeredUserId,
              job_id: safeJobId,
              subject: safeJobTitle ? `Job Opportunity: ${safeJobTitle}` : "Career Invitation",
              message: `You have been invited by ${companyName || "a partner employer"} for the position: ${safeJobTitle || "Open Role"} on VOS Sync.`,
              status: "PENDING",
              created_by: userId,
              created_at: nowPH,
              updated_at: nowPH,
            }),
          });
          if (appInvRes.ok) {
            const appInvJson = await appInvRes.json();
            invitationId = appInvJson.data?.invitation_id ?? null;
          }
        } catch (appInvErr: unknown) {
          console.error("[campus-talent/invite] vs_applicant_invitation error:", appInvErr);
        }
      }
    }

    const invitationPayload: CampusInvitationPayload = {
      studentId,
      schoolId: schoolId || 0,
      jobId: safeJobId,
      companyId,
      recipientEmail,
      recipientName,
      schoolName: schoolName || "Partner Institution",
      courseName,
      jobTitle: safeJobTitle,
      companyName: companyName || "Partner Employer",
      recruiterId: userId,
    };

    // ── Attempt email dispatch ────────────────────────────────────────
    let emailSent = false;
    const emailSubject = safeJobTitle
      ? `Career Opportunity: ${safeJobTitle} at ${invitationPayload.companyName}`
      : `Invitation to connect with ${invitationPayload.companyName} on VOS Sync`;

    try {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: recipientEmail,
        subject: emailSubject,
        html: buildInvitationHtml(invitationPayload, actionLink, Boolean(registeredUserId)),
      });
      emailSent = true;
    } catch (mailErr: unknown) {
      console.error("[campus-talent/invite] SMTP failure:", mailErr);
    }

    // ── Update vs_school_student status upon successful dispatch ──────
    if (emailSent) {
      await updateStudentInvitationStatus(studentId, "Invited", nowPH);
    } else {
      return NextResponse.json(
        {
          success: false,
          invitationId,
          error: "Invitation record was created but email delivery failed. You may retry.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invitationId,
      sentTo: recipientEmail,
      expiresAt,
    });
  } catch (err: unknown) {
    console.error("[campus-talent/invite POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
