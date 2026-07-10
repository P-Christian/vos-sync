// src/modules/client/interviews/components/InterviewForm.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InterviewFormData,
  InterviewFormat,
  INTERVIEW_FORMAT_LABELS,
} from "../types";

interface InterviewFormProps {
  data: InterviewFormData;
  onChange: (field: keyof InterviewFormData, value: string) => void;
  errors?: Partial<Record<keyof InterviewFormData, string>>;
}

export default function InterviewForm({
  data,
  onChange,
  errors,
}: InterviewFormProps) {
  return (
    <div className="space-y-4">
      {/* Application ID */}
      <div className="space-y-1.5">
        <Label htmlFor="if-app-id" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Application ID <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="if-app-id"
          type="number"
          value={data.application_id}
          onChange={(e) => onChange("application_id", e.target.value)}
          placeholder="e.g. 101"
          className={`h-9 text-sm ${errors?.application_id ? "border-rose-400" : ""}`}
        />
        {errors?.application_id && (
          <p className="text-[11px] text-rose-500">{errors.application_id}</p>
        )}
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="if-date" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Interview Date <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="if-date"
            type="date"
            value={data.interview_date}
            onChange={(e) => onChange("interview_date", e.target.value)}
            className={`h-9 text-sm ${errors?.interview_date ? "border-rose-400" : ""}`}
          />
          {errors?.interview_date && (
            <p className="text-[11px] text-rose-500">{errors.interview_date}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="if-time" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Interview Time <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="if-time"
            type="time"
            value={data.interview_time}
            onChange={(e) => onChange("interview_time", e.target.value)}
            className={`h-9 text-sm ${errors?.interview_time ? "border-rose-400" : ""}`}
          />
          {errors?.interview_time && (
            <p className="text-[11px] text-rose-500">{errors.interview_time}</p>
          )}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-1.5">
        <Label htmlFor="if-format" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Interview Format <span className="text-rose-500">*</span>
        </Label>
        <Select
          value={data.interview_format}
          onValueChange={(v) => onChange("interview_format", v as InterviewFormat)}
        >
          <SelectTrigger
            id="if-format"
            className={`h-9 text-sm ${errors?.interview_format ? "border-rose-400" : ""}`}
          >
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(INTERVIEW_FORMAT_LABELS) as [InterviewFormat, string][]).map(
              ([k, v]) => (
                <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {errors?.interview_format && (
          <p className="text-[11px] text-rose-500">{errors.interview_format}</p>
        )}
      </div>

      {/* Meeting Link / Location */}
      {data.interview_format === "ONLINE" && (
        <div className="space-y-1.5">
          <Label htmlFor="if-link" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Meeting Link
          </Label>
          <Input
            id="if-link"
            value={data.meeting_link}
            onChange={(e) => onChange("meeting_link", e.target.value)}
            placeholder="https://meet.google.com/..."
            className="h-9 text-sm"
          />
        </div>
      )}

      {data.interview_format === "ONSITE" && (
        <div className="space-y-1.5">
          <Label htmlFor="if-location" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Meeting Location
          </Label>
          <Input
            id="if-location"
            value={data.meeting_location}
            onChange={(e) => onChange("meeting_location", e.target.value)}
            placeholder="e.g. 3F Conference Room, Ayala Tower"
            className="h-9 text-sm"
          />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="if-notes" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Interview Notes (optional)
        </Label>
        <Textarea
          id="if-notes"
          value={data.interview_notes}
          onChange={(e) => onChange("interview_notes", e.target.value)}
          rows={3}
          placeholder="Any notes to share with the interviewer or candidate..."
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
}

