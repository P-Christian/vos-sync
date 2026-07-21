// src/lib/mail/templates/interview.ts
import { InterviewTemplateData } from "../types";

export function interviewScheduledTemplate(data: InterviewTemplateData) {
  const {
    candidateName,
    companyName,
    jobTitle,
    scheduledAt,
    timezone = "Asia/Manila",
    durationMinutes = 60,
    interviewFormat,
    meetingLink,
    meetingLocation,
    candidateNotes,
  } = data;

  const formattedDate = new Date(scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return {
    subject: `Interview Scheduled: ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px; background-color: #ffffff; color: #18181b;">
        <div style="border-bottom: 1px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #14a800; margin: 0;">VOS Sync</h1>
          <p style="font-size: 12px; color: #71717a; margin: 4px 0 0 0;">Interview Invitation</p>
        </div>

        <h2 style="font-size: 18px; font-weight: 700; color: #09090b; margin-top: 0;">Hello ${candidateName},</h2>
        
        <p style="font-size: 14px; line-height: 1.6; color: #3f3f46;">
          Great news! <strong>${companyName}</strong> has scheduled an interview with you for the position of <strong>${jobTitle}</strong>.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">📅 Date & Time:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">⏱️ Duration:</td>
              <td style="padding: 6px 0; color: #0f172a;">${durationMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🌐 Timezone:</td>
              <td style="padding: 6px 0; color: #0f172a;">${timezone}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📌 Format:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${interviewFormat}</td>
            </tr>
            ${
              meetingLink
                ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🔗 Meeting Link:</td>
              <td style="padding: 6px 0;"><a href="${meetingLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Join Meeting</a></td>
            </tr>
            `
                : ""
            }
            ${
              meetingLocation
                ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📍 Location:</td>
              <td style="padding: 6px 0; color: #0f172a;">${meetingLocation}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>

        ${
          candidateNotes
            ? `
        <div style="background-color: #f1f5f9; border-left: 4px solid #14a800; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <p style="font-size: 12px; font-weight: 700; color: #475569; margin: 0 0 6px 0; text-transform: uppercase;">Message from Employer:</p>
          <p style="font-size: 13px; color: #334155; margin: 0; white-space: pre-line;">${candidateNotes}</p>
        </div>
        `
            : ""
        }

        <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
          You can review your active applications and upcoming interview schedules anytime by logging into your <a href="http://localhost:3000/vos-sync/freelancer/applications" style="color: #14a800; font-weight: 600;">VOS Sync Portal</a>.
        </p>

        <div style="border-top: 1px solid #f4f4f5; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #a1a1aa; text-align: center;">
          Sent by VOS Sync Recruitment System &bull; Automatic notification
        </div>
      </div>
    `,
  };
}
