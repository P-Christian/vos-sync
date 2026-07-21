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
  action_data: Record<string, unknown> | null;
  is_read: boolean | number;
  created_at: string;
}
