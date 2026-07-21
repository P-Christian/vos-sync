"use client";

// src/modules/client/interviews/components/InterviewList.tsx

import React from "react";
import { Interview, InterviewStatus } from "../types";
import InterviewStatusBadge from "./InterviewStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Eye,
  Star,
  RefreshCw,
  XCircle,
  CheckCircle2,
} from "lucide-react";

interface InterviewListProps {
  interviews: Interview[];
  onViewDetails: (interview: Interview) => void;
  onOpenEvaluation: (interview: Interview) => void;
  onReschedule: (interview: Interview) => void;
  onOpenCancelModal: (interview: Interview) => void;
}

function CandidateAvatar({ name, avatar }: { name?: string; avatar?: string | null }) {
  const [imgError, setImgError] = React.useState(false);

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name || "Candidate"}
        onError={() => setImgError(true)}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shrink-0 mt-0.5"
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
      {name?.[0] || "C"}
    </div>
  );
}

export default function InterviewList({
  interviews,
  onViewDetails,
  onOpenEvaluation,
  onReschedule,
  onOpenCancelModal,
}: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <Calendar className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          No Interviews Found
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          There are no interview schedules matching your current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {interviews.map((item) => {
        const formattedDate = item.scheduled_at
          ? new Date(item.scheduled_at).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—";

        const formattedTime = item.scheduled_at
          ? new Date(item.scheduled_at).toLocaleTimeString("en-PH", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

        return (
          <div
            key={item.interview_id}
            className="p-5 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            {/* Candidate & Schedule info */}
            <div className="flex items-start gap-4 min-w-0">
              <CandidateAvatar name={item.applicant_name} avatar={item.applicant_avatar} />

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {item.applicant_name}
                  </h4>
                  <InterviewStatusBadge status={item.interview_status} />
                </div>

                <p className="text-xs text-zinc-500 truncate">
                  Role: <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.job_title}</span>
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    {formattedTime} ({item.duration_minutes ?? 60}m)
                  </span>
                  <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                    {item.interview_format === "ONLINE" ? (
                      <Video className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {item.interview_format}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(item)}
                className="h-8 text-xs rounded-lg gap-1.5"
              >
                <Eye className="h-3.5 w-3.5 text-zinc-500" />
                View & Q&A
              </Button>

              {item.interview_status === "SCHEDULED" ||
              item.interview_status === "CONFIRMED" ||
              item.interview_status === "RESCHEDULED" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReschedule(item)}
                    className="h-8 text-xs rounded-lg gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                    Reschedule
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => onOpenEvaluation(item)}
                    className="h-8 text-xs rounded-lg gap-1.5 bg-[#14a800] hover:bg-[#118f00] text-white border-0"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Evaluate & Complete
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenCancelModal(item)}
                    className="h-8 text-xs rounded-lg gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    Cancel
                  </Button>
                </>
              ) : item.interview_status === "COMPLETED" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenEvaluation(item)}
                  className="h-8 text-xs rounded-lg gap-1.5 text-amber-600 border-amber-200"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {item.evaluation_score ? `Rated ${item.evaluation_score}/5` : "Add Rating"}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
