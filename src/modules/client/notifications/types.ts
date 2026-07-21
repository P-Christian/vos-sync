// src/modules/client/notifications/types.ts

export interface Notification {
  notification_id: number;
  user_id: number;
  event_id: number;
  category: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
  // from vs_notification_event join
  event_type?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
}

export interface NotificationPreference {
  preference_id?: number;
  user_id: number;
  category: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  updated_at?: string | null;
}

export type NotificationChannel = "EMAIL" | "IN_APP";
export type NotificationDeliveryStatus = "SENT" | "FAILED" | "PENDING";

// Category labels for display
export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  JOB_APPLICATION: "Job Applications",
  INTERVIEW: "Interviews",
  JOB_POSTING: "Job Postings",
  SYSTEM: "System Alerts",
  COMPANY: "Company Updates",
};

// Icons mapped to categories (lucide icon names)
export const NOTIFICATION_CATEGORY_ICONS: Record<string, string> = {
  JOB_APPLICATION: "Users",
  INTERVIEW: "Calendar",
  JOB_POSTING: "Briefcase",
  SYSTEM: "Bell",
  COMPANY: "Building2",
};
