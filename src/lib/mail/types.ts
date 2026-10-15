// src/lib/mail/types.ts

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
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
  baseUrl?: string;
}

export type InterviewReminderTemplateData = InterviewTemplateData;

export interface ApplicationTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  appliedAt: string;
  baseUrl?: string;
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
  baseUrl?: string;
}

export interface ShortlistedTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  baseUrl?: string;
}

export interface HiringTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  notes?: string | null;
  baseUrl?: string;
}

export interface RejectionTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  notes?: string | null;
  baseUrl?: string;
}

export interface InvitationTemplateData {
  candidateName: string;
  companyName: string;
  jobTitle?: string | null;
  jobDescription?: string | null;
  jobLocation?: string | null;
  workArrangement?: string | null;
  jobType?: string | null;
  salaryRange?: string | null;
  message: string;
  actionUrl?: string;
  baseUrl?: string;
}

