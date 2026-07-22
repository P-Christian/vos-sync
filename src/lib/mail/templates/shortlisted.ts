// src/lib/mail/templates/shortlisted.ts
import { ShortlistedTemplateData } from "../types";

export function shortlistedTemplate(data: ShortlistedTemplateData) {
  const { candidateName, companyName, jobTitle } = data;

  return {
    subject: `You've Been Shortlisted: ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px; background-color: #ffffff; color: #18181b;">
        <div style="border-bottom: 1px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #14a800; margin: 0;">VOS Sync</h1>
          <p style="font-size: 12px; color: #71717a; margin: 4px 0 0 0;">Application Status Update</p>
        </div>

        <h2 style="font-size: 18px; font-weight: 700; color: #09090b; margin-top: 0;">Congratulations ${candidateName}!</h2>
        
        <p style="font-size: 14px; line-height: 1.6; color: #3f3f46;">
          Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been reviewed and <span style="color: #7c3aed; font-weight: 700;">SHORTLISTED</span>!
        </p>

        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="font-size: 13px; color: #5b21b6; margin: 0; line-height: 1.5;">
            The hiring team at <strong>${companyName}</strong> is impressed with your profile and may contact you soon for an interview.
          </p>
        </div>

        <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
          Keep your notifications on and check your <a href="http://localhost:3010/vos-sync/freelancer/applications" style="color: #14a800; font-weight: 600;">VOS Sync Portal</a> for updates.
        </p>

        <div style="border-top: 1px solid #f4f4f5; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #a1a1aa; text-align: center;">
          Sent by VOS Sync Recruitment System &bull; Automatic notification
        </div>
      </div>
    `,
  };
}
