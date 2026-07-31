// src/lib/mail/services/employer-mail.ts

import { sendMail } from "../index";
import {
  employerSubmissionTemplate,
  employerApprovalTemplate,
  employerRejectionTemplate,
  EmployerMailParams,
} from "../templates/employer";

/**
 * Send receipt confirmation upon Employer Registration submission
 */
export async function sendEmployerSubmissionEmail({
  email,
  companyName,
  recipientName,
}: EmployerMailParams & { email: string }) {
  const template = employerSubmissionTemplate({ companyName, recipientName });

  return sendMail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
}

/**
 * Send email upon Admin Approval of Employer account
 */
export async function sendEmployerApprovalEmail({
  email,
  companyName,
  recipientName,
  loginUrl,
}: EmployerMailParams & { email: string }) {
  const template = employerApprovalTemplate({ companyName, recipientName, loginUrl });

  return sendMail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
}

/**
 * Send email upon Admin Rejection of Employer account
 */
export async function sendEmployerRejectionEmail({
  email,
  companyName,
  recipientName,
  rejectionReason,
  supportEmail,
}: EmployerMailParams & { email: string }) {
  const template = employerRejectionTemplate({
    companyName,
    recipientName,
    rejectionReason,
    supportEmail,
  });

  return sendMail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
}
