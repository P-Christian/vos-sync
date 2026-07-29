// src/modules/freelancer/freelancer-notifications/types/index.ts
export interface NotificationEvent {
  event_id: number;
  event_type: string;
  recipient_user_id: number;
  entity_type?: string | null;
  entity_id?: number | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
}

export interface FreelancerNotification {
  notification_id: number;
  user_id: number;
  event_id: number;
  category: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean | number;
  is_starred?: boolean | number;
  created_at: string;
}

export interface FreelancerNotificationPreference {
  preference_id?: number;
  user_id: number;
  category: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start?: string | null;  // HH:MM format or null
  quiet_hours_end?: string | null;    // HH:MM format or null
  timezone?: string | null;           // IANA string or null
  updated_at?: string | null;
}

export interface FreelancerNotificationCategoryItem {
  category: string;
  label: string;
  description?: string;
  defaultEmail: boolean;
  defaultInApp: boolean;
}

export interface FreelancerNotificationCategoryGroup {
  title: string;
  description: string;
  categories: FreelancerNotificationCategoryItem[];
}

export const FREELANCER_NOTIFICATION_CATEGORIES: FreelancerNotificationCategoryGroup[] = [
  {
    title: "Job Applications",
    description: "Notifications regarding your submitted job applications and status changes.",
    categories: [
      { category: "Application Updates", label: "Job application updates", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Interviews",
    description: "Notifications for scheduled, rescheduled, and cancelled interviews.",
    categories: [
      { category: "INTERVIEW", label: "Interview scheduled, updated, or cancelled", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Referrals",
    description: "Notifications for referral invitations, attributes, and updates.",
    categories: [
      { category: "Referral Updates", label: "Referral program updates", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Profile Activity",
    description: "Updates about views and checks on your profile.",
    categories: [
      { category: "Profile Activity", label: "Profile views & activity notifications", defaultEmail: false, defaultInApp: true },
    ],
  },
  {
    title: "Messages",
    description: "Notifications for communication with clients and employers.",
    categories: [
      { category: "MESSAGE_RECEIVED", label: "New message received", defaultEmail: true, defaultInApp: true },
      { category: "UNREAD_MESSAGE_REMINDER", label: "Unread message reminders", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Marketing & Updates",
    description: "Product feature announcements and promotional emails.",
    categories: [
      { category: "PRODUCT_UPDATES", label: "Product updates & announcements", defaultEmail: false, defaultInApp: true },
      { category: "MARKETING_UPDATES", label: "Promotional and marketing emails", defaultEmail: false, defaultInApp: false },
    ],
  },
];

