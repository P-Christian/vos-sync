// src/lib/mail/services/employer-mail.ts

import { sendMail } from "../index";
import {
  employerAccountCreationTemplate,
  employerVerificationTemplate,
  employerApprovalTemplate,
  employerRejectionTemplate,
  EmployerMailParams,
} from "../templates/employer";

/**
 * Send email upon Employer Account Creation & OTP Verification
 */
export async function sendEmployerAccountCreationEmail({
  email,
  companyName,
  recipientName,
}: EmployerMailParams & { email: string }) {
  const template = employerAccountCreationTemplate({ companyName, recipientName });

  return sendMail({
    to: email,
    subject: template.subject,
    html: template.html,
  });
}

/**
 * Send receipt confirmation upon Employer Registration / Document Verification submission
 */
export async function sendEmployerSubmissionEmail({
  email,
  companyName,
  recipientName,
}: EmployerMailParams & { email: string }) {
  const template = employerVerificationTemplate({ companyName, recipientName });

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
