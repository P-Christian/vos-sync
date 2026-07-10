import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"VOS Sync" <no-reply@vossync.com>`;

  console.log(`[MAIL] Preparing to send OTP to ${to}. Host configured: ${host ? "Yes" : "No"}`);

  if (!host || !user || !pass) {
    console.warn(
      `[MAIL WARNING] SMTP settings are not fully configured in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS). OTP code [${otp}] was printed to console instead.`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from,
    to,
    subject: "Verify your VOS Sync Account",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e4e4e7; padding: 24px; border-radius: 12px;">
        <h2 style="color: #18181b; font-weight: 700; margin-top: 0;">Verify your VOS Sync Account</h2>
        <p style="color: #71717a; font-size: 14px; line-height: 1.5;">
          Thank you for registering on VOS Sync. Use the following One-Time Password (OTP) to complete your verification process:
        </p>
        <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #18181b; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #a1a1aa; font-size: 11px; margin-bottom: 0;">
          This code is valid for 15 minutes. If you did not request this code, please ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[MAIL] OTP successfully sent to ${to}`);
}
