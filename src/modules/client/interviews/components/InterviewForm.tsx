"use client";

// src/modules/client/interviews/components/InterviewForm.tsx

import React from "react";
import { InterviewFormData, InterviewFormat, INTERVIEW_FORMAT_LABELS } from "../types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface InterviewFormProps {
  data: InterviewFormData;
  onChange: (field: keyof InterviewFormData, value: string | number) => void;
  errors?: Partial<Record<keyof InterviewFormData, string>>;
  disableApplicationId?: boolean;
}

export default function InterviewForm({
  data,
  onChange,
  errors = {},
  disableApplicationId = false,
}: InterviewFormProps) {
  return (
    <div className="space-y-4">
      {/* Application ID */}
      {!disableApplicationId && (
        <div className="space-y-1.5">
          <Label htmlFor="app-id" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Application ID <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="app-id"
            value={data.application_id}
            onChange={(e) => onChange("application_id", e.target.value)}
            placeholder="e.g. 12"
            className="h-9 text-sm rounded-lg"
          />
          {errors.application_id && (
            <p className="text-[11px] text-rose-500">{errors.application_id}</p>
          )}
        </div>
      )}

      {/* Scheduled At Datetime Picker & Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="sched-at" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Scheduled Date & Time <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="sched-at"
            type="datetime-local"
            value={data.scheduled_at}
            onChange={(e) => onChange("scheduled_at", e.target.value)}
            className="h-9 text-sm rounded-lg"
          />
          {errors.scheduled_at && (
            <p className="text-[11px] text-rose-500">{errors.scheduled_at}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Duration (Mins)
          </Label>
          <Input
            id="duration"
            type="number"
            value={data.duration_minutes}
            onChange={(e) => onChange("duration_minutes", parseInt(e.target.value, 10) || 60)}
            placeholder="60"
            className="h-9 text-sm rounded-lg"
          />
        </div>
      </div>

      {/* Format & Timezone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="format" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Interview Format <span className="text-rose-500">*</span>
          </Label>
          <select
            id="format"
            value={data.interview_format}
            onChange={(e) => onChange("interview_format", e.target.value as InterviewFormat)}
            className="w-full h-9 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Format --</option>
            {Object.entries(INTERVIEW_FORMAT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {errors.interview_format && (
            <p className="text-[11px] text-rose-500">{errors.interview_format}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Timezone
          </Label>
          <Input
            id="timezone"
            value={data.timezone}
            onChange={(e) => onChange("timezone", e.target.value)}
            placeholder="Asia/Manila"
            className="h-9 text-sm rounded-lg"
          />
        </div>
      </div>

      {/* Meeting Link (for ONLINE) */}
      {data.interview_format === "ONLINE" && (
        <div className="space-y-1.5">
          <Label htmlFor="link" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Meeting Link (Google Meet / Zoom / Teams)
          </Label>
          <Input
            id="link"
            value={data.meeting_link}
            onChange={(e) => onChange("meeting_link", e.target.value)}
            placeholder="https://meet.google.com/xyz-abc-123"
            className="h-9 text-sm rounded-lg"
          />
        </div>
      )}

      {/* Meeting Location (for ONSITE) */}
      {data.interview_format === "ONSITE" && (
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Office Location / Room
          </Label>
          <Input
            id="location"
            value={data.meeting_location}
            onChange={(e) => onChange("meeting_location", e.target.value)}
            placeholder="e.g. 5th Floor Conference Room A, Building 2"
            className="h-9 text-sm rounded-lg"
          />
        </div>
      )}

      {/* Internal Notes & Candidate Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Interviewer Notes <span className="text-zinc-400 font-normal">(Internal)</span>
          </Label>
          <Textarea
            id="notes"
            value={data.interview_notes}
            onChange={(e) => onChange("interview_notes", e.target.value)}
            rows={3}
            placeholder="Focus areas or interviewer instructions..."
            className="text-xs rounded-lg resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cand-notes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Candidate Notes <span className="text-zinc-400 font-normal">(Shared)</span>
          </Label>
          <Textarea
            id="cand-notes"
            value={data.candidate_notes}
            onChange={(e) => onChange("candidate_notes", e.target.value)}
            rows={3}
            placeholder="Instructions or requirements shared with candidate..."
            className="text-xs rounded-lg resize-none"
          />
        </div>
      </div>
    </div>
  );
}
