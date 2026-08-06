"use client";

// src/modules/client/interviews/components/InterviewForm.tsx

import React, { useMemo, useState, useEffect } from "react";
import {
  Interview,
  InterviewFormData,
  InterviewFormat,
  INTERVIEW_FORMAT_LABELS,
  TIMEZONE_OPTIONS,
} from "../types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import InterviewDateTimePicker, { getInterviewDisplayLabel } from "./InterviewDateTimePicker";
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  Lock,
  CheckCircle,
  User,
  Briefcase,
  Video,
  Building,
  Phone,
  Users,
  BriefcaseBusiness,
} from "lucide-react";

export interface JobOption {
  job_id: number;
  job_title: string;
}

export interface ApplicantOption {
  application_id: number;
  job_id: number;
  applicant_name?: string;
  applicant_email?: string;
  application_status?: string;
  applicant_profile_image_url?: string | null;
}

interface InterviewFormProps {
  data: InterviewFormData;
  onChange: (field: keyof InterviewFormData, value: any) => void;
  errors?: Partial<Record<keyof InterviewFormData, string>>;
  disableApplicationId?: boolean;
  existingInterviews?: Interview[];
  availableJobs?: JobOption[];
  availableApplicants?: ApplicantOption[];
}

const BLOCKING_STATUSES = new Set(["SCHEDULED", "CONFIRMED", "RESCHEDULED"]);
const BUFFER_MINUTES = 15;
const BUFFER_MS = BUFFER_MINUTES * 60 * 1000;

function extractDateStr(dateStr?: string): string {
  if (!dateStr) return "";
  const norm = dateStr.replace(" ", "T");
  const match = norm.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(norm);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeRange(dateStr: string, durationMinutes: number = 60): string {
  const norm = dateStr.replace(" ", "T");
  const start = new Date(norm);
  if (isNaN(start.getTime())) return dateStr;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return `${formatTime(start)} – ${formatTime(end)}`;
}

export default function InterviewForm({
  data,
  onChange,
  errors = {},
  disableApplicationId = false,
  existingInterviews = [],
  availableJobs = [],
  availableApplicants = [],
}: InterviewFormProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const selectedDateStr = extractDateStr(data.scheduled_at);

  // Auto-detect job ID from selected application_ids
  useEffect(() => {
    if (data.application_ids && data.application_ids.length > 0 && availableApplicants.length > 0) {
      const match = availableApplicants.find((a) => a.application_id === data.application_ids[0]);
      if (match && match.job_id) {
        setSelectedJobId(String(match.job_id));
      }
    }
  }, [data.application_ids, availableApplicants]);

  const activeExistingInterviews = useMemo(() => {
    return existingInterviews.filter((iv) => {
      if (!BLOCKING_STATUSES.has(iv.interview_status)) return false;
      if (data.interview_id && String(iv.interview_id) === String(data.interview_id)) {
        return false;
      }
      return true;
    });
  }, [existingInterviews, data.interview_id]);

  const scheduledDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const iv of activeExistingInterviews) {
      const d = extractDateStr(iv.scheduled_at);
      if (d) set.add(d);
    }
    return set;
  }, [activeExistingInterviews]);

  const dateInterviews = useMemo(() => {
    if (!selectedDateStr || activeExistingInterviews.length === 0) return [];
    return activeExistingInterviews.filter(
      (iv) => extractDateStr(iv.scheduled_at) === selectedDateStr
    );
  }, [selectedDateStr, activeExistingInterviews]);

  const conflict = useMemo(() => {
    if (!data.scheduled_at || dateInterviews.length === 0) return null;

    const currentStart = new Date(data.scheduled_at.replace(" ", "T")).getTime();
    if (isNaN(currentStart)) return null;

    const currentDurationMs = (data.duration_minutes || 60) * 60 * 1000;
    const currentEndWithBuffer = currentStart + currentDurationMs + BUFFER_MS;

    for (const iv of dateInterviews) {
      const ivStart = new Date(iv.scheduled_at.replace(" ", "T")).getTime();
      if (isNaN(ivStart)) continue;
      const ivEndWithBuffer = ivStart + (iv.duration_minutes || 60) * 60 * 1000 + BUFFER_MS;

      if (currentStart < ivEndWithBuffer && currentEndWithBuffer > ivStart) {
        return iv;
      }
    }
    return null;
  }, [data.scheduled_at, data.duration_minutes, dateInterviews]);

  const getSlotStatus = (timeSlot: string): { isBooked: boolean; booking?: Interview } => {
    if (!selectedDateStr) return { isBooked: false };
    const slotStart = new Date(`${selectedDateStr}T${timeSlot}:00`).getTime();
    if (isNaN(slotStart)) return { isBooked: false };

    const selectedDurationMs = (data.duration_minutes || 60) * 60 * 1000;
    const slotEndWithBuffer = slotStart + selectedDurationMs + BUFFER_MS;

    for (const iv of dateInterviews) {
      const ivStart = new Date(iv.scheduled_at.replace(" ", "T")).getTime();
      if (isNaN(ivStart)) continue;
      const ivEndWithBuffer = ivStart + (iv.duration_minutes || 60) * 60 * 1000 + BUFFER_MS;

      if (slotStart < ivEndWithBuffer && slotEndWithBuffer > ivStart) {
        return { isBooked: true, booking: iv };
      }
    }
    return { isBooked: false };
  };

  // Candidates filtered by selected job AND excluding REJECTED or WITHDRAWN applicants
  const filteredApplicants = useMemo(() => {
    const nonRejected = availableApplicants.filter(
      (a) => a.application_status !== "REJECTED" && a.application_status !== "WITHDRAWN"
    );
    if (!selectedJobId) return nonRejected;
    return nonRejected.filter((a) => String(a.job_id) === String(selectedJobId));
  }, [availableApplicants, selectedJobId]);

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    onChange("application_ids", []);
  };

  const toggleCandidate = (appId: number) => {
    const current = data.application_ids || [];
    if (current.includes(appId)) {
      onChange("application_ids", current.filter((id) => id !== appId));
    } else {
      onChange("application_ids", [...current, appId]);
    }
  };

  const selectAllCandidatesForJob = () => {
    const allIds = filteredApplicants.map((a) => a.application_id);
    onChange("application_ids", allIds);
  };

  return (
    <div className="space-y-5">
      {!disableApplicationId && (
        <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
          {/* Step 1: Select Job Position */}
          <div className="space-y-1.5">
            <Label htmlFor="select-job" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <BriefcaseBusiness className="h-4 w-4 text-indigo-500" />
              1. Choose Job Position <span className="text-rose-500">*</span>
            </Label>
            <select
              id="select-job"
              value={selectedJobId}
              onChange={(e) => handleJobSelect(e.target.value)}
              className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            >
              <option value="">-- Select Target Job Position --</option>
              {availableJobs.map((j) => (
                <option key={j.job_id} value={String(j.job_id)}>
                  {j.job_title}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Candidates by Name */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-500" />
                2. Select Candidate Attendee(s) <span className="text-rose-500">*</span>
              </Label>
              {filteredApplicants.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllCandidatesForJob}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Select All ({filteredApplicants.length})
                </button>
              )}
            </div>

            {!selectedJobId ? (
              <p className="text-xs text-zinc-400 italic p-3 bg-white dark:bg-zinc-950 rounded-lg text-center border">
                Please select a job position first to list candidate applicants.
              </p>
            ) : filteredApplicants.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-3 bg-white dark:bg-zinc-950 rounded-lg text-center border">
                No active candidate applicants found for this job posting.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white dark:bg-zinc-950 border rounded-lg">
                {filteredApplicants.map((app) => {
                  const isChecked = (data.application_ids || []).includes(app.application_id);
                  return (
                    <label
                      key={app.application_id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 font-semibold"
                          : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleCandidate(app.application_id)}
                        />
                        <div className="min-w-0">
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">
                            {app.applicant_name || `Applicant #${app.application_id}`}
                          </span>
                          {app.applicant_email && (
                            <span className="text-[11px] text-zinc-400 font-normal block truncate">
                              {app.applicant_email}
                            </span>
                          )}
                        </div>
                      </div>

                      {app.application_status && (
                        <Badge variant="outline" className="text-[10px] shrink-0 font-medium ml-2">
                          {app.application_status}
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {errors.application_ids && (
              <p className="text-[11px] text-rose-500 font-semibold">{errors.application_ids}</p>
            )}
          </div>
        </div>
      )}

      {/* Color Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-xl text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
        <span className="font-bold uppercase tracking-wider text-zinc-400 text-[10px]">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> 🟢 Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> 🔴 Booked (15m Buffer)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 🟡 Selected
        </span>
        {conflict && (
          <span className="flex items-center gap-1.5 text-rose-600 font-bold">
            <AlertTriangle className="h-3 w-3" /> ⚠️ Conflict Detected
          </span>
        )}
      </div>

      {/* Scheduled At Datetime Picker & Duration */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Scheduled Date & Time <span className="text-rose-500">*</span>
              </Label>
              {scheduledDatesSet.size > 0 && (
                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
                  {scheduledDatesSet.size} date{scheduledDatesSet.size !== 1 ? "s" : ""} booked
                </span>
              )}
            </div>

            {/* Custom InterviewDateTimePicker Component */}
            <InterviewDateTimePicker
              value={data.scheduled_at}
              onChange={(val) => onChange("scheduled_at", val)}
              durationMinutes={data.duration_minutes}
              scheduledDatesSet={scheduledDatesSet}
              existingInterviews={existingInterviews}
              dateInterviews={dateInterviews}
              getSlotStatus={getSlotStatus}
              hasConflict={Boolean(conflict)}
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

        {/* Schedule Conflict Warning */}
        {conflict && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>Schedule Overlap Warning:</strong> Time slot conflicts with{" "}
              <strong>{getInterviewDisplayLabel(conflict)}</strong> at{" "}
              {formatTimeRange(conflict.scheduled_at, conflict.duration_minutes)} (enforcing 15m buffer).
            </span>
          </div>
        )}

        {/* Existing Scheduled Interview List with Context Popover */}
        {selectedDateStr && dateInterviews.length > 0 && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
                Active Interviews on {selectedDateStr} ({dateInterviews.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {dateInterviews.map((iv) => {
                const label = getInterviewDisplayLabel(iv);
                return (
                  <Popover key={iv.interview_id}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:border-indigo-400 transition-colors"
                      >
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {formatTimeRange(iv.scheduled_at, iv.duration_minutes)}
                        </span>
                        <span className="text-zinc-500 font-medium">({label})</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-72 p-3 text-xs space-y-2 shadow-xl">
                      <div className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 border-b pb-1.5">
                        <User className="h-4 w-4 text-indigo-500" />
                        {label}
                      </div>
                      <div className="space-y-1 text-zinc-600 dark:text-zinc-300">
                        {iv.applications?.[0]?.job_title && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Position: <strong>{iv.applications[0].job_title}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Time: {formatTimeRange(iv.scheduled_at, iv.duration_minutes)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {iv.interview_format === "ONLINE" ? (
                            <Video className="h-3.5 w-3.5 text-indigo-500" />
                          ) : iv.interview_format === "ONSITE" ? (
                            <Building className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Phone className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          <span>Format: {INTERVIEW_FORMAT_LABELS[iv.interview_format] || iv.interview_format}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Format & Timezone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="format" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Interview Format <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={data.interview_format}
            onValueChange={(val) => onChange("interview_format", val as InterviewFormat)}
          >
            <SelectTrigger id="format" className="w-full h-9 text-sm rounded-lg">
              <SelectValue placeholder="-- Select Format --" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTERVIEW_FORMAT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.interview_format && (
            <p className="text-[11px] text-rose-500">{errors.interview_format}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Timezone
          </Label>
          <Select
            value={data.timezone || "Asia/Manila"}
            onValueChange={(val) => onChange("timezone", val)}
          >
            <SelectTrigger id="timezone" className="w-full h-9 text-sm rounded-lg">
              <SelectValue placeholder="Select Timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
              {data.timezone && !TIMEZONE_OPTIONS.some((tz) => tz.value === data.timezone) && (
                <SelectItem value={data.timezone}>{data.timezone}</SelectItem>
              )}
            </SelectContent>
          </Select>
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

      {/* Internal Notes */}
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
    </div>
  );
}
