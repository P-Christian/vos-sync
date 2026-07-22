// src/lib/mail/services/auth-mail.ts

import { sendMail } from "../index";
import { otpTemplate } from "../templates/otp";

export async function sendOtpEmail(email: string, otp: string) {
  const template = otpTemplate(otp);

  return sendMail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
}
