"use client";

// src/modules/shared/messaging/components/InterviewCard.tsx

import React, { useEffect, useState } from "react";
import { CalendarDays, Clock, ExternalLink, Loader2, Monitor, MapPin, RefreshCw } from "lucide-react";
import { Message } from "@/modules/client/messaging/types";

interface InterviewCardData {
  event_type: string;
  interview_id: number;
  scheduled_at: string | null;
  duration_minutes: number;
  timezone: string;
  interview_format: string;
  meeting_link: string | null;
  meeting_location: string | null;
  interview_status: string | null;
}

interface Props {
  message: Message;
}

const EVENT_META: Record<string, { icon: React.ReactNode; label: string; accent: string }> = {
  INTERVIEW_SCHEDULED: {
    icon: <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
    label: "Interview Scheduled",
    accent: "bg-violet-50 dark:bg-violet-950/40 border-violet-200/60 dark:border-violet-800/40",
  },
  INTERVIEW_UPDATED: {
    icon: <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    label: "Interview Rescheduled",
    accent: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40",
  },
};

function formatScheduledAt(dateStr: string | null, timezone: string): string {
  if (!dateStr) return "TBD";
  try {
    return new Date(dateStr).toLocaleString("en-PH", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function tzAbbr(tz: string): string {
  const abbrs: Record<string, string> = {
    "Asia/Manila": "PHT",
    "Asia/Singapore": "SGT",
    "UTC": "UTC",
  };
  return abbrs[tz] ?? tz;
}

export default function InterviewCard({ message }: Props) {
  const [data, setData] = useState<InterviewCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/messaging/system-card?message_id=${message.message_id}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setData(json ?? null); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [message.message_id]);

  const eventType = message.system_message?.event_type ?? "INTERVIEW_SCHEDULED";
  const meta = EVENT_META[eventType] ?? EVENT_META["INTERVIEW_SCHEDULED"];

  if (loading) {
    return (
      <div className={`w-80 rounded-2xl border p-4 ${meta.accent} flex items-center gap-3`}>
        <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
        <span className="text-xs text-zinc-400">Loading...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`w-80 rounded-2xl border p-4 ${meta.accent}`}>
        <div className="flex items-center gap-2">
          {meta.icon}
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{meta.label}</span>
        </div>
      </div>
    );
  }

  const isOnline = data.interview_format === "ONLINE";

  return (
    <div className={`w-80 rounded-2xl border shadow-sm overflow-hidden ${meta.accent}`}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-inherit flex items-center gap-2">
        {meta.icon}
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        {/* Date/Time */}
        <div className="flex items-start gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {formatScheduledAt(data.scheduled_at, data.timezone)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {tzAbbr(data.timezone)}
            </p>
          </div>
        </div>

        {/* Duration + Format */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-zinc-400" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.duration_minutes} min
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Monitor className="h-3 w-3 text-violet-500" />
            ) : (
              <MapPin className="h-3 w-3 text-zinc-400" />
            )}
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {isOnline ? "Online" : data.interview_format}
            </span>
          </div>
        </div>

        {/* Location / Meeting link */}
        {isOnline && data.meeting_link ? (
          <a
            href={data.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
          >
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            Join Meeting
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : !isOnline && data.meeting_location ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {data.meeting_location}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
