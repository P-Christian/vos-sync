// src/lib/notifications.ts
export interface CreateNotificationParams {
  event_type: string;
  recipient_user_id: number;
  entity_type?: string;
  entity_id?: number;
  payload?: Record<string, unknown>;
  category: string;
  title: string;
  message: string;
  action_url?: string;
}

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

export async function createNotification(params: CreateNotificationParams) {
  try {
    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // 1. Insert into vs_notification_event
    const eventPayload = {
      event_type: params.event_type,
      recipient_user_id: params.recipient_user_id,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      payload: params.payload ? JSON.stringify(params.payload) : null,
      created_at: nowPH,
    };

    const eventRes = await fetch(`${DIRECTUS_BASE}/items/vs_notification_event`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(eventPayload),
    });

    if (!eventRes.ok) {
      console.error("Failed to create vs_notification_event", await eventRes.text());
      return false;
    }

    const eventData = await eventRes.json();
    const eventId = eventData.data.id || eventData.data.event_id;

    if (!eventId) {
      console.error("No event ID returned");
      return false;
    }

    // 2. Insert into vs_freelancer_notification
    const notifPayload = {
      user_id: params.recipient_user_id,
      event_id: eventId,
      category: params.category,
      title: params.title,
      message: params.message,
      action_url: params.action_url || null,
      is_read: false,
      created_at: nowPH,
    };

    const notifRes = await fetch(`${DIRECTUS_BASE}/items/vs_freelancer_notification`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(notifPayload),
    });

    if (!notifRes.ok) {
      console.error("Failed to create vs_freelancer_notification", await notifRes.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
}
