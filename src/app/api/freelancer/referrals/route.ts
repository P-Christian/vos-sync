import { NextRequest, NextResponse } from "next/server";
import { createReferralRecord } from "@/modules/freelancer/freelancer-referrals/services/referral.service";
import { sendMail } from "@/lib/mail";
import { createNotification } from "@/lib/notifications";

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

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { job_id, recipient_email } = body;

    if (!job_id) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    const result = await createReferralRecord(userId, Number(job_id), recipient_email);

    // If an email is supplied, send the invite via SMTP
    if (recipient_email) {
      const jobRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${job_id}?fields=job_title,company_id.company_name`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      let jobTitle = "Opportunity";
      let companyName = "VOS Sync Partner";
      if (jobRes.ok) {
        const jData = (await jobRes.json()).data;
        jobTitle = jData?.job_title || jobTitle;
        companyName = jData?.company_id?.company_name || companyName;
      }

      const userRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}?fields=user_fname,user_lname`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      let referrerName = "A friend";
      if (userRes.ok) {
        const u = (await userRes.json()).data;
        referrerName = `${u?.user_fname ?? ""} ${u?.user_lname ?? ""}`.trim() || referrerName;
      }

      const inviteUrl = `${req.nextUrl.origin}/referral/${result.token}`;

      await sendMail({
        to: recipient_email,
        subject: `${referrerName} referred you to a job: ${jobTitle}`,
        text: `Hello!\n\n${referrerName} has referred you to view the ${jobTitle} position at ${companyName}.\n\nView details and apply here: ${inviteUrl}\n\nBest regards,\nVOS Sync Team`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>You have been referred!</h2>
            <p><strong>${referrerName}</strong> has invited you to view the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Job Details & Apply</a>
            </p>
            <p style="font-size: 12px; color: #777; margin-top: 40px;">If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      }).catch((err) => console.error("Referral SMTP invite email error:", err));

      // Check if recipient is a registered freelancer/user
      try {
        const recipientRes = await fetch(`${DIRECTUS_BASE}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(recipient_email.trim().toLowerCase())}&fields=user_id`, {
          headers: getHeaders(),
          cache: "no-store",
        });
        if (recipientRes.ok) {
          const recJson = await recipientRes.json();
          const recData = recJson.data || [];
          if (recData.length > 0) {
            const recipientUserId = Number(recData[0].user_id);
            await createNotification({
              event_type: "referral_received",
              recipient_user_id: recipientUserId,
              entity_type: "job_referral",
              entity_id: result.referral.referral_id,
              category: "Referrals",
              title: "New Job Referral Opportunity",
              message: `${referrerName} has referred you to the position: ${jobTitle}. Click to review details and accept.`,
              action_url: `/referral/${result.token}`,
            });
          }
        }
      } catch (err) {
        console.error("Failed to notify recipient user in-app:", err);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create referral.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_referral?filter[referrer_user_id][_eq]=${userId}&sort[]=-created_at&fields=*,job_id.job_id,job_id.job_title&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch referrals." }, { status: 500 });
    }

    const json = await res.json();
    return NextResponse.json({ referrals: json.data || [] });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
