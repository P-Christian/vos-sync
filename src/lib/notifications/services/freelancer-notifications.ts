// src/lib/notifications/services/freelancer-notifications.ts

import { CreateFreelancerNotificationParams } from "../types";
import { isInAppEnabledForUser } from "../preference-check";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

/**
 * Creates a notification for a freelancer (job seeker).
 * Automatically checks vs_notification_preference before creating.
 * Flow: vs_notification_event → vs_freelancer_notification
 */
export async function createFreelancerNotification(
  params: CreateFreelancerNotificationParams
): Promise<boolean> {
  try {
    // 0. Check notification preference first
    const isEnabled = await isInAppEnabledForUser(
      params.recipient_user_id,
      params.category
    );
    if (!isEnabled) {
      console.log(
        `[FREELANCER NOTIFICATION] Skipping notification for user ${params.recipient_user_id}, category ${params.category} (disabled in preferences)`
      );
      return false;
    }
    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // 1. Insert into vs_notification_event
    const eventRes = await fetch(`${DIRECTUS_BASE}/items/vs_notification_event`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        event_type: params.event_type,
        recipient_user_id: params.recipient_user_id,
        entity_type: params.entity_type || null,
        entity_id: params.entity_id || null,
        payload: params.payload ? JSON.stringify(params.payload) : null,
        created_at: nowPH,
      }),
    });

    if (!eventRes.ok) {
      console.error(
        "[FREELANCER NOTIFICATION] Failed to create vs_notification_event:",
        await eventRes.text()
      );
      return false;
    }

    const eventData = await eventRes.json();
    const eventId = eventData.data?.event_id ?? eventData.data?.id;

    if (!eventId) {
      console.error("[FREELANCER NOTIFICATION] No event_id returned from vs_notification_event");
      return false;
    }

    // 2. Insert into vs_freelancer_notification
    const notifRes = await fetch(`${DIRECTUS_BASE}/items/vs_freelancer_notification`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: params.recipient_user_id,
        event_id: eventId,
        category: params.category,
        title: params.title,
        message: params.message,
        action_url: params.action_url || null,
        is_read: 0,
        created_at: nowPH,
      }),
    });

    if (!notifRes.ok) {
      console.error(
        "[FREELANCER NOTIFICATION] Failed to create vs_freelancer_notification:",
        await notifRes.text()
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[FREELANCER NOTIFICATION] Error:", err);
    return false;
  }
}
