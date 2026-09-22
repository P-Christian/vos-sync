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

async function createInvitationRecord(
  payload: CampusInvitationPayload,
  token: string,
  expiresAt: string
): Promise<{ invitation_id: number } | null> {
  const res = await fetch(`${DIRECTUS_BASE}/items/vs_campus_talent_invitation`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      student_id: payload.studentId,
      school_id: payload.schoolId,
      job_id: payload.jobId,
      company_id: payload.companyId,
      recruiter_id: payload.recruiterId,
      recipient_email: payload.recipientEmail,
      token,
      status: "PENDING",
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

async function updateInvitationStatus(
  invitationId: number,
  status: "SENT" | "FAILED",
  sentAt?: string
): Promise<void> {
  await fetch(`${DIRECTUS_BASE}/items/vs_campus_talent_invitation/${invitationId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      status,
      ...(sentAt ? { sent_at: sentAt } : {}),
    }),
  });
}

async function updateStudentInvitationStatus(
  studentId: number,
  status: "Invited"
): Promise<void> {
  await fetch(`${DIRECTUS_BASE}/items/vs_school_student/${studentId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      invitation_status: status,
      invited_at: new Date().toISOString(),
    }),
  });
}

function buildInvitationHtml(payload: CampusInvitationPayload, registrationLink: string): string {
  const studentName = `${payload.recipientName}`;
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
      <strong>${payload.companyName}</strong> has reviewed your academic profile at <strong>${payload.schoolName}</strong>
      and would like to invite you to apply for the following role:
    </p>
    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <strong style="color: #0c4a6e;">${payload.jobTitle}</strong>
      ${payload.courseName ? `<p style="margin: 4px 0; color: #475569; font-size: 14px;">Matched to your program: ${payload.courseName}</p>` : ""}
    </div>
    <p style="color: #475569;">Click the button below to register on VOS Sync and view the full job posting:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${registrationLink}"
         style="background: #0ea5e9; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Register &amp; View Opportunity
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

    const body = (await req.json()) as CampusInvitationPayload;
    const { studentId, schoolId, jobId, recipientEmail, recipientName, schoolName, courseName, jobTitle, companyName } = body;

    if (!studentId || !schoolId || !jobId || !recipientEmail || !recipientName) {
      return NextResponse.json({ error: "Missing required invitation fields." }, { status: 400 });
    }

    // Generate invitation token and expiry
    const inviteToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const registrationLink = `${APP_URL}/register?invite=${inviteToken}&ref=campus`;

    // ── Step 1: Create PENDING record (DB first, before email) ───────────────
    const invitationPayload: CampusInvitationPayload = {
      studentId,
      schoolId,
      jobId,
      companyId,
      recipientEmail,
      recipientName,
      schoolName,
      courseName,
      jobTitle,
      companyName,
      recruiterId: userId,
    };

    const record = await createInvitationRecord(invitationPayload, inviteToken, expiresAt);
    if (!record) {
      return NextResponse.json({ error: "Failed to create invitation record." }, { status: 500 });
    }

    const invitationId = record.invitation_id;

    // ── Step 2: Attempt email dispatch ────────────────────────────────────────
    let emailSent = false;
    try {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: recipientEmail,
        subject: `Career Opportunity: ${jobTitle} at ${companyName}`,
        html: buildInvitationHtml(invitationPayload, registrationLink),
      });
      emailSent = true;
    } catch (mailErr: unknown) {
      // Email failure is isolated — DB record is updated to FAILED but no crash
      console.error("[campus-talent/invite] SMTP failure:", mailErr);
    }

    // ── Step 3: Update invitation record to SENT or FAILED ───────────────────
    const now = new Date().toISOString();
    await updateInvitationStatus(invitationId, emailSent ? "SENT" : "FAILED", emailSent ? now : undefined);

    // ── Step 4: Update vs_school_student only if SENT ─────────────────────────
    if (emailSent) {
      await updateStudentInvitationStatus(studentId, "Invited");
    }

    if (!emailSent) {
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
