// src/modules/client/messaging/types.ts

export type ConversationType = "JOB_APPLICATION" | "DIRECT_MESSAGE" | "SUPPORT";
export type ConversationStatus = "ACTIVE" | "ARCHIVED" | "BLOCKED";
export type MessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";

export interface Conversation {
  conversation_id: number;
  job_id: number | null;
  client_id: number;
  freelancer_id: number;
  conversation_type: ConversationType;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  archived_by_client: boolean;
  archived_by_freelancer: boolean;
  archived_at: string | null;
  // Enriched server-side
  other_party_name?: string;
  other_party_avatar?: string | null;
  other_party_email?: string | null;
  job_title?: string | null;
  unread_count?: number;
  last_message_preview?: string;
}

export interface Message {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  message_content: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  is_deleted: boolean;
  attachments: MessageAttachment[];
}

export interface MessageAttachment {
  attachment_id: number;
  message_id: number;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface SendMessagePayload {
  message_content?: string;
  message_type?: MessageType;
  attachments?: Omit<MessageAttachment, "attachment_id" | "message_id" | "created_at">[];
}

export interface CreateConversationPayload {
  freelancer_id: number;
  job_id?: number | null;
  conversation_type?: ConversationType;
}

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  JOB_APPLICATION: "Job Application",
  DIRECT_MESSAGE: "Direct Message",
  SUPPORT: "Support",
};
