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
  InvitationTemplateData,
} from "../types";
import { interviewScheduledTemplate, interviewRescheduledTemplate } from "../templates/interview";
import { shortlistedTemplate } from "../templates/shortlisted";
import { applicationSubmittedTemplate, newApplicationReceivedTemplate } from "../templates/application";
import { hiringTemplate } from "../templates/hiring";
import { rejectionTemplate } from "../templates/rejection";
import { invitationTemplate } from "../templates/invitation";
import { resolveBaseUrl } from "../templates/base-url";
import { generateICS } from "../calendar/ics";

export async function sendInterviewRescheduledEmail(to: string, data: InterviewTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = interviewRescheduledTemplate({ ...data, baseUrl });

  const start = new Date(data.scheduledAt);
  const duration = data.durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const icsContent = generateICS({
    uid: `interview-rescheduled-${Date.now()}-${data.candidateName.replace(/\s+/g, "_")}@vossync.com`,
    start,
    end,
    summary: `Rescheduled Interview: ${data.jobTitle} at ${data.companyName}`,
    description: `Rescheduled interview for ${data.jobTitle} with ${data.companyName}.${data.candidateNotes ? `\n\nNotes: ${data.candidateNotes}` : ""}`,
    location: data.meetingLink || data.meetingLocation || "Online",
  });

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    attachments: [
      {
        filename: "interview.ics",
        content: icsContent,
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendInterviewScheduledEmail(to: string, data: InterviewTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = interviewScheduledTemplate({ ...data, baseUrl });

  const start = new Date(data.scheduledAt);
  const duration = data.durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const icsContent = generateICS({
    uid: `interview-${Date.now()}-${data.candidateName.replace(/\s+/g, "_")}@vossync.com`,
    start,
    end,
    summary: `Interview: ${data.jobTitle} at ${data.companyName}`,
    description: `Interview for ${data.jobTitle} with ${data.companyName}.${data.candidateNotes ? `\n\nNotes: ${data.candidateNotes}` : ""}`,
    location: data.meetingLink || data.meetingLocation || "Online",
  });

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    attachments: [
      {
        filename: "interview.ics",
        content: icsContent,
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendInterviewReminderEmail(to: string, data: InterviewReminderTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = interviewScheduledTemplate({ ...data, baseUrl });

  const start = new Date(data.scheduledAt);
  const duration = data.durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const icsContent = generateICS({
    uid: `interview-reminder-${Date.now()}-${data.candidateName.replace(/\s+/g, "_")}@vossync.com`,
    start,
    end,
    summary: `Reminder: Interview: ${data.jobTitle} at ${data.companyName}`,
    description: `Reminder for interview for ${data.jobTitle} with ${data.companyName}.${data.candidateNotes ? `\n\nNotes: ${data.candidateNotes}` : ""}`,
    location: data.meetingLink || data.meetingLocation || "Online",
  });

  return sendMail({
    to,
    subject: `Reminder: Interview Scheduled for ${data.jobTitle} at ${data.companyName}`,
    html: template.html,
    attachments: [
      {
        filename: "interview.ics",
        content: icsContent,
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendApplicationSubmittedEmail(to: string, data: ApplicationTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = applicationSubmittedTemplate({ ...data, baseUrl });
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendNewApplicationReceivedEmail(to: string, data: NewApplicationNotificationData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = newApplicationReceivedTemplate({ ...data, baseUrl });
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendShortlistedEmail(to: string, data: ShortlistedTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = shortlistedTemplate({ ...data, baseUrl });
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendHiringEmail(to: string, data: HiringTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = hiringTemplate({ ...data, baseUrl });
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendRejectionEmail(to: string, data: RejectionTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = rejectionTemplate({ ...data, baseUrl });
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}

export async function sendInvitationEmail(to: string, data: InvitationTemplateData) {
  const baseUrl = data.baseUrl || (await resolveBaseUrl());
  const template = invitationTemplate({ ...data, baseUrl });
  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
  });
}


