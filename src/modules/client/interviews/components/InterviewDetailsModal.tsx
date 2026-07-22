"use client";

// src/modules/client/interviews/components/InterviewDetailsModal.tsx

import React from "react";
import { Interview } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InterviewStatusBadge from "./InterviewStatusBadge";
import ScreeningAnswersView from "./ScreeningAnswersView";
import { Calendar, Clock, Video, MapPin, Star, Globe } from "lucide-react";
import Image from "next/image";

interface InterviewDetailsModalProps {
  interview: Interview | null;
  open: boolean;
  onClose: () => void;
  onOpenEvaluation?: (interview: Interview) => void;
}

function CandidateAvatar({ name, avatar }: { name?: string; avatar?: string | null }) {
  const [imgError, setImgError] = React.useState(false);

  if (avatar && !imgError) {
    return (
      <Image
        src={avatar}
        alt={name || "Candidate"}
        width={64}
        height={64}
        onError={() => setImgError(true)}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shrink-0"
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
      {name?.[0] || "C"}
    </div>
  );
}

export default function InterviewDetailsModal({
  interview,
  open,
  onClose,
  onOpenEvaluation,
}: InterviewDetailsModalProps) {
  if (!interview) return null;

  const formattedDate = interview.scheduled_at
    ? new Date(interview.scheduled_at).toLocaleDateString("en-PH", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : "—";

  const formattedTime = interview.scheduled_at
    ? new Date(interview.scheduled_at).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Interview Details & Screening Overview
            </DialogTitle>
            <InterviewStatusBadge status={interview.interview_status} />
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Candidate & Job Info */}
          <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <CandidateAvatar name={interview.applicant_name} avatar={interview.applicant_avatar} />
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {interview.applicant_name}
              </h4>
              <p className="text-xs text-zinc-500">
                Applying for: <span className="font-medium text-zinc-700 dark:text-zinc-300">{interview.job_title}</span>
              </p>
            </div>
          </div>

          {/* Schedule Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Date</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {formattedDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Time & Duration</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {formattedTime} ({interview.duration_minutes ?? 60}m)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Timezone</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {interview.timezone || "Asia/Manila"}
                </span>
              </div>
            </div>
          </div>

          {/* Format & Location / Link */}
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              {interview.interview_format === "ONLINE" ? (
                <Video className="h-4 w-4 text-emerald-500" />
              ) : (
                <MapPin className="h-4 w-4 text-amber-500" />
              )}
              Format: {interview.interview_format}
            </div>

            {interview.meeting_link && (
              <div className="text-xs">
                <span className="text-zinc-400">Meeting Link: </span>
                <a
                  href={
                    interview.meeting_link.startsWith('http://') || interview.meeting_link.startsWith('https://')
                      ? interview.meeting_link
                      : `https://${interview.meeting_link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 underline font-mono break-all"
                >
                  {interview.meeting_link}
                </a>
              </div>
            )}


            {interview.meeting_location && (
              <div className="text-xs text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-400">Location: </span>
                {interview.meeting_location}
              </div>
            )}
          </div>

          {/* Cancellation reason if cancelled */}
          {interview.cancel_reason && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              <span className="font-bold">Cancellation Reason: </span>
              {interview.cancel_reason}
            </div>
          )}

          {/* Evaluation Rating & Feedback if Completed */}
          {(interview.evaluation_score || interview.feedback) && (
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl space-y-2">
              {interview.evaluation_score && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    Evaluation Rating: {interview.evaluation_score} / 5 Stars
                  </span>
                </div>
              )}
              {interview.feedback && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                  &ldquo;{interview.feedback}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Screening Answers Component */}
          <ScreeningAnswersView screeningAnswers={interview.screening_answers} />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {onOpenEvaluation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenEvaluation(interview);
              }}
              className="h-8 text-xs rounded-lg gap-1.5"
            >
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Evaluate Interview
            </Button>
          )}
          <Button variant="default" size="sm" onClick={onClose} className="h-8 text-xs rounded-lg ml-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
