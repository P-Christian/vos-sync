// src/lib/mail/types.ts

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface OtpTemplateData {
  otp: string;
  expiryMinutes?: number;
}

export interface InterviewTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  scheduledAt: string;
  timezone?: string;
  durationMinutes?: number;
  interviewFormat: string;
  meetingLink?: string | null;
  meetingLocation?: string | null;
  candidateNotes?: string | null;
}

export interface InterviewReminderTemplateData extends InterviewTemplateData {}

export interface ApplicationTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  appliedAt: string;
}

export interface NewApplicationNotificationData {
  employerName?: string;
  companyName: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  expectedSalary?: string | number | null;
  appliedAt: string;
  applicationId: number;
}

export interface ShortlistedTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
}

export interface HiringTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  notes?: string | null;
}

export interface RejectionTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  notes?: string | null;
}
