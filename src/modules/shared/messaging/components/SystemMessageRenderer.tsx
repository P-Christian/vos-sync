"use client";

// src/modules/shared/messaging/components/SystemMessageRenderer.tsx

import React from "react";
import SystemPill from "./SystemPill";
import ApplicationCard from "./ApplicationCard";
import InterviewCard from "./InterviewCard";
import { Message, SystemEventType } from "@/modules/client/messaging/types";

// ── Registry ────────────────────────────────────────────────────────────────
// Add new event types here as the platform grows (offers, contracts, payments…)
const SYSTEM_MESSAGE_RENDERERS: Partial<
  Record<SystemEventType, React.ComponentType<{ message: Message }>>
> = {
  APPLICATION_SUBMITTED:      ApplicationCard,
  APPLICATION_STATUS_CHANGED: ApplicationCard,
  HIRED:                      ApplicationCard,
  INTERVIEW_SCHEDULED:        InterviewCard,
  INTERVIEW_UPDATED:          InterviewCard,
};

interface Props {
  message: Message;
}

export default function SystemMessageRenderer({ message }: Props) {
  const sm = message.system_message;

  // Permanent fallback — never remove.
  // Handles: legacy messages, unknown event types, missing vs_system_message row.
  if (!sm) {
    return <SystemPill text={message.message_content} />;
  }

  const Component = SYSTEM_MESSAGE_RENDERERS[sm.event_type];

  return Component ? (
    <Component message={message} />
  ) : (
    <SystemPill text={message.message_content} />
  );
}
