// src/lib/notifications/types.ts

/**
 * Base params shared by all notification creators.
 */
export interface CreateNotificationBaseParams {
  event_type: string;
  entity_type?: string;
  entity_id?: number;
  payload?: Record<string, unknown>;
  category: string;
  title: string;
  message: string;
  action_url?: string;
}

/**
 * Params for creating a notification for a freelancer (job seeker).
 * Writes to vs_notification_event → vs_freelancer_notification.
 */
export interface CreateFreelancerNotificationParams extends CreateNotificationBaseParams {
  recipient_user_id: number;
}

/**
 * Params for creating a notification for an employer (client).
 * Writes to vs_notification_event → vs_employer_notification.
 */
export interface CreateEmployerNotificationParams extends CreateNotificationBaseParams {
  recipient_user_id: number;
}
