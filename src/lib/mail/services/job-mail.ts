// src/lib/mail/services/job-mail.ts

import { sendMail } from "../index";
import {
  InterviewTemplateData,
  InterviewReminderTemplateData,
  ApplicationTemplateData,
  NewApplicationNotificationData,
  ShortlistedTemplateData,
  HiringTemplateData,
  RejectionTemplateData,
} from "../types";
import { interviewScheduledTemplate } from "../templates/interview";
import { shortlistedTemplate } from "../templates/shortlisted";
import { applicationSubmittedTemplate, newApplicationReceivedTemplate } from "../templates/application";
import { hiringTemplate } from "../templates/hiring";
import { rejectionTemplate } from "../templates/rejection";

export async function sendInterviewScheduledEmail(to: string, data: InterviewTemplateData) {
  const template = interviewScheduledTemplate(data);
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendInterviewReminderEmail(to: string, data: InterviewReminderTemplateData) {
  const template = interviewScheduledTemplate(data);
  return sendMail({
    to,
    subject: `Reminder: Interview Scheduled for ${data.jobTitle} at ${data.companyName}`,
    html: template.html,
  });
}

export async function sendApplicationSubmittedEmail(to: string, data: ApplicationTemplateData) {
  const template = applicationSubmittedTemplate(data);
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendNewApplicationReceivedEmail(to: string, data: NewApplicationNotificationData) {
  const template = newApplicationReceivedTemplate(data);
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendShortlistedEmail(to: string, data: ShortlistedTemplateData) {
  const template = shortlistedTemplate(data);
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendHiringEmail(to: string, data: HiringTemplateData) {
  const template = hiringTemplate(data);
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendRejectionEmail(to: string, data: RejectionTemplateData) {
  const template = rejectionTemplate(data);
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}
