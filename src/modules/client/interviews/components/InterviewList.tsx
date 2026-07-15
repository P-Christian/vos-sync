// src/modules/client/interviews/components/InterviewList.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Monitor, MapPin, User } from "lucide-react";
import InterviewStatusBadge from "./InterviewStatusBadge";
import { Interview, INTERVIEW_FORMAT_LABELS, InterviewStatus } from "../types";

interface InterviewListProps {
  interviews: Interview[];
  onUpdateStatus: (interview: Interview) => void;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":");
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? "PM" : "AM";
    const display = hours % 12 || 12;
    return `${display}:${m} ${suffix}`;
  } catch {
    return timeStr;
  }
}

export default function InterviewList({ interviews, onUpdateStatus }: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4">
          <Calendar className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
          No interviews scheduled
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Schedule interviews from the Applicants page or use the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {interviews.map((iv) => (
        <Card key={iv.interview_id} className="hover:shadow-lg transition-all duration-200 border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    {iv.applicant_name ?? `Application #${iv.application_id}`}
                  </h3>
                  <InterviewStatusBadge status={iv.interview_status as InterviewStatus} />
                </div>
                {iv.job_title && (
                  <p className="text-xs text-zinc-500 mt-0.5">{iv.job_title}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(iv.interview_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(iv.interview_time)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    {INTERVIEW_FORMAT_LABELS[iv.interview_format] ?? iv.interview_format}
                  </span>
                  {iv.meeting_link && (
                    <a
                      href={iv.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <User className="h-3 w-3" />
                      Join Link
                    </a>
                  )}
                  {iv.meeting_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {iv.meeting_location}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(iv)}
                className="h-8 px-3 text-xs rounded-lg shrink-0"
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

