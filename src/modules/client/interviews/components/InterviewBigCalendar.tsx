"use client";

// src/modules/client/interviews/components/InterviewBigCalendar.tsx

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Interview,
  InterviewStatus,
  InterviewFormData,
  EvaluationFormData,
  AttendanceStatus,
} from "../types";
import InterviewStatusBadge from "./InterviewStatusBadge";
import InterviewForm, { JobOption, ApplicantOption } from "./InterviewForm";
import ScreeningAnswersView from "./ScreeningAnswersView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  Eye,
  MessageSquare,
  RefreshCw,
  XCircle,
  Maximize2,
  Minimize2,
  X,
  AlertCircle,
  CheckCircle,
  Lock,
  Calendar,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface InterviewBigCalendarProps {
  interviews: Interview[];
  onViewDetails: (interview: Interview) => void;
  onOpenEvaluation: (interview: Interview) => void;
  onReschedule: (interview: Interview) => void;
  onOpenCancelModal: (interview: Interview) => void;
  onScheduleDate?: (dateStr: string) => void;
  availableJobs?: JobOption[];
  availableApplicants?: ApplicantOption[];
  saving?: boolean;
  onCreateInterview?: (data: InterviewFormData) => Promise<boolean>;
  onUpdateStatus?: (
    interviewId: number,
    status: InterviewStatus,
    formData?: InterviewFormData,
    reason?: string
  ) => Promise<boolean>;
  onSaveEvaluation?: (payload: EvaluationFormData) => Promise<boolean>;
  onConfirmCancel?: (interviewId: number, reason: string) => Promise<boolean>;
}

type FullscreenModalType =
  | "details"
  | "schedule"
  | "reschedule"
  | "feedback"
  | "cancel"
  | null;

const COMMON_CANCEL_REASONS = [
  "Schedule conflict / Recruiter unavailable",
  "Candidate requested cancellation / withdrawal",
  "Position has been filled",
  "Candidate unresponsive to confirmation",
  "Other reason",
];

export default function InterviewBigCalendar({
  interviews,
  onViewDetails,
  onOpenEvaluation,
  onReschedule,
  onOpenCancelModal,
  onScheduleDate,
  availableJobs = [],
  availableApplicants = [],
  saving = false,
  onCreateInterview,
  onUpdateStatus,
  onSaveEvaluation,
  onConfirmCancel,
}: InterviewBigCalendarProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen In-Place Modals State
  const [fullscreenModal, setFullscreenModal] = useState<FullscreenModalType>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedDayInterviews, setSelectedDayInterviews] = useState<{
    date: Date;
    interviews: Interview[];
  } | null>(null);

  // Schedule & Reschedule Form State in Fullscreen
  const [formData, setFormData] = useState<InterviewFormData>({
    interview_id: "",
    application_ids: [],
    scheduled_at: "",
    duration_minutes: 60,
    timezone: "Asia/Manila",
    interview_format: "ONLINE",
    meeting_link: "",
    meeting_location: "",
    interview_notes: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof InterviewFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Candidate Evaluation Form State in Fullscreen
  const [evalAppId, setEvalAppId] = useState<number>(0);
  const [evalAttendance, setEvalAttendance] = useState<AttendanceStatus>("ATTENDED");
  const [evalFeedback, setEvalFeedback] = useState<string>("");
  const [evalDecision, setEvalDecision] = useState<"HIRED" | "REJECTED" | "NO_ACTION">("NO_ACTION");

  // Cancel Interview State in Fullscreen
  const [cancelReason, setCancelReason] = useState(COMMON_CANCEL_REASONS[0]);
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Sync state with native browser fullscreen changes (e.g. Esc, F11, or button)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        setFullscreenModal(null);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if (
            (
              containerRef.current as unknown as {
                webkitRequestFullscreen?: () => Promise<void>;
              }
            ).webkitRequestFullscreen
          ) {
            await (
              containerRef.current as unknown as {
                webkitRequestFullscreen: () => Promise<void>;
              }
            ).webkitRequestFullscreen();
          } else if (
            (
              containerRef.current as unknown as {
                msRequestFullscreen?: () => Promise<void>;
              }
            ).msRequestFullscreen
          ) {
            await (
              containerRef.current as unknown as {
                msRequestFullscreen: () => Promise<void>;
              }
            ).msRequestFullscreen();
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (
          (document as unknown as { webkitExitFullscreen?: () => Promise<void> })
            .webkitExitFullscreen
        ) {
          await (
            document as unknown as {
              webkitExitFullscreen: () => Promise<void>;
            }
          ).webkitExitFullscreen();
        } else if (
          (document as unknown as { msExitFullscreen?: () => Promise<void> })
            .msExitFullscreen
        ) {
          await (
            document as unknown as { msExitFullscreen: () => Promise<void> }
          ).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
  };

  // Month navigation handlers
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Calculate calendar grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Group interviews by YYYY-MM-DD
  const interviewsByDate = useMemo(() => {
    const map = new Map<string, Interview[]>();
    interviews.forEach((item) => {
      if (!item.scheduled_at) return;
      try {
        const dateKey = format(parseISO(item.scheduled_at), "yyyy-MM-dd");
        const list = map.get(dateKey) || [];
        list.push(item);
        map.set(dateKey, list);
      } catch {
        // Ignore invalid dates
      }
    });

    // Sort each day's interviews by time
    map.forEach((list) => {
      list.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
    });

    return map;
  }, [interviews]);

  const getEventBadgeStyle = (status: InterviewStatus) => {
    switch (status) {
      case "SCHEDULED":
      case "CONFIRMED":
        return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100";
      case "RESCHEDULED":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100";
      case "COMPLETED":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100";
      case "CANCELLED":
        return "bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50 line-through opacity-75 hover:bg-rose-100/60";
      case "NO_SHOW":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 line-through opacity-70";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  const getCandidateLabel = (item: Interview) => {
    const apps = item.applications || [];
    if (apps.length === 0) return "Interview Slot";
    if (apps.length === 1) return apps[0].applicant_name || "1 Candidate";
    return `${apps[0].applicant_name || "Candidate"} (+${apps.length - 1})`;
  };

  // ── In-Fullscreen Modal Opening Handlers ─────────────────────────────────────
  const openFullscreenDetails = (iv: Interview) => {
    setSelectedInterview(iv);
    setFullscreenModal("details");
  };

  const openFullscreenSchedule = (dateStr: string) => {
    setFormData({
      interview_id: "",
      application_ids: [],
      scheduled_at: `${dateStr}T09:00`,
      duration_minutes: 60,
      timezone: "Asia/Manila",
      interview_format: "ONLINE",
      meeting_link: "",
      meeting_location: "",
      interview_notes: "",
    });
    setFormErrors({});
    setFullscreenModal("schedule");
  };

  const openFullscreenReschedule = (iv: Interview) => {
    setSelectedInterview(iv);
    let localDatetime = "";
    if (iv.scheduled_at) {
      const normalized = iv.scheduled_at.replace(" ", "T");
      const match = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
      if (match) {
        localDatetime = match[1];
      } else {
        const d = new Date(normalized);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hours = String(d.getHours()).padStart(2, "0");
          const mins = String(d.getMinutes()).padStart(2, "0");
          localDatetime = `${year}-${month}-${day}T${hours}:${mins}`;
        }
      }
    }

    const appIds = iv.applications
      ? iv.applications.map((a) => a.application_id)
      : [];

    setFormData({
      interview_id: String(iv.interview_id),
      application_ids: appIds,
      scheduled_at: localDatetime,
      duration_minutes: iv.duration_minutes ?? 60,
      timezone: iv.timezone || "Asia/Manila",
      interview_format: iv.interview_format,
      meeting_link: iv.meeting_link || "",
      meeting_location: iv.meeting_location || "",
      interview_notes: iv.interview_notes || "",
    });
    setFormErrors({});
    setFullscreenModal("reschedule");
  };

  const openFullscreenFeedback = (iv: Interview) => {
    setSelectedInterview(iv);
    const apps = iv.applications || [];
    if (apps.length > 0) {
      setEvalAppId(apps[0].interview_application_id);
      setEvalAttendance(
        apps[0].attendance_status === "NO_SHOW" ? "NO_SHOW" : "ATTENDED"
      );
      setEvalFeedback(apps[0].feedback || "");
    }
    setFullscreenModal("feedback");
  };

  const openFullscreenCancel = (iv: Interview) => {
    setSelectedInterview(iv);
    setCancelReason(COMMON_CANCEL_REASONS[0]);
    setCustomCancelReason("");
    setCancelError("");
    setFullscreenModal("cancel");
  };

  // ── In-Fullscreen Modal Submission Handlers ──────────────────────────────────
  const handleSaveInterviewFullscreen = async () => {
    const errors: Partial<Record<keyof InterviewFormData, string>> = {};
    if (
      fullscreenModal === "schedule" &&
      (!formData.application_ids || formData.application_ids.length === 0)
    ) {
      errors.application_ids = "Please select at least one candidate attendee.";
    }
    if (!formData.scheduled_at)
      errors.scheduled_at = "Scheduled Date & Time is required.";
    if (!formData.interview_format)
      errors.interview_format = "Interview format is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (
        fullscreenModal === "reschedule" &&
        formData.interview_id &&
        onUpdateStatus
      ) {
        const ok = await onUpdateStatus(
          Number(formData.interview_id),
          "RESCHEDULED",
          formData
        );
        if (ok) setFullscreenModal(null);
      } else if (onCreateInterview) {
        const ok = await onCreateInterview(formData);
        if (ok) setFullscreenModal(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEvaluationFullscreen = async () => {
    if (!onSaveEvaluation || !selectedInterview) return;
    setIsSubmitting(true);
    try {
      const ok = await onSaveEvaluation({
        interview_application_id: evalAppId,
        attendance_status: evalAttendance,
        feedback: evalFeedback,
        decision: evalDecision,
      });
      if (ok) setFullscreenModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancelFullscreen = async () => {
    if (!onConfirmCancel || !selectedInterview) return;
    let finalReason = cancelReason;
    if (cancelReason === "Other reason") {
      finalReason = customCancelReason.trim();
      if (!finalReason) {
        setCancelError("Please provide a reason for cancellation.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const ok = await onConfirmCancel(
        selectedInterview.interview_id,
        finalReason
      );
      if (ok) setFullscreenModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompletedEvaluation =
    selectedInterview?.interview_status === "COMPLETED" ||
    selectedInterview?.interview_status === "CANCELLED";

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-200 relative ${
        isFullscreen
          ? "bg-background text-foreground h-screen w-screen p-4 sm:p-6 overflow-y-auto flex flex-col space-y-4"
          : "space-y-4"
      }`}
    >
      {/* Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-3 text-xs font-medium rounded-lg"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white ml-2">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>

        {/* Legend and Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Rescheduled
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Completed
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Cancelled
            </span>
          </div>

          {/* Fullscreen Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc / F11)" : "Fullscreen Calendar (F11)"}
            className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Calendar Main Grid Container */}
      <div className={`border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm ${isFullscreen ? "flex-1 flex flex-col" : ""}`}>
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/60 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 py-2.5 shrink-0">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Days Matrix */}
        <div className={`grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/10 ${isFullscreen ? "flex-1" : ""}`}>
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayInterviews = interviewsByDate.get(dateKey) || [];
            const isCurrentMonthDay = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const MAX_FIT_COUNT = isFullscreen ? 5 : 3;
            const hasOverflow = dayInterviews.length > MAX_FIT_COUNT;
            const visibleCount = hasOverflow ? MAX_FIT_COUNT - 1 : MAX_FIT_COUNT;
            const overflowCount = dayInterviews.length - visibleCount;
            const visibleInterviews = dayInterviews.slice(0, visibleCount);

            return (
              <div
                key={dateKey}
                onClick={() =>
                  setSelectedDayInterviews({
                    date: day,
                    interviews: dayInterviews,
                  })
                }
                className={`${
                  isFullscreen
                    ? "min-h-[150px] sm:min-h-[180px] p-2 sm:p-2.5"
                    : "min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2"
                } flex flex-col justify-between transition-colors relative group cursor-pointer hover:bg-zinc-50/90 dark:hover:bg-zinc-900/60 ${
                  !isCurrentMonthDay
                    ? "bg-zinc-100/40 dark:bg-zinc-900/20 text-zinc-400 dark:text-zinc-600"
                    : "bg-white dark:bg-zinc-950"
                } ${isTodayDate ? "ring-2 ring-indigo-500/40 dark:ring-indigo-500/50 z-10" : ""}`}
              >
                {/* Day Header Row */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                      isTodayDate
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isCurrentMonthDay
                        ? "text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Add Interview Quick Action Button */}
                  {(onScheduleDate || onCreateInterview) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFullscreen) {
                          openFullscreenSchedule(format(day, "yyyy-MM-dd"));
                        } else if (onScheduleDate) {
                          onScheduleDate(format(day, "yyyy-MM-dd"));
                        }
                      }}
                      title={`Schedule interview on ${format(day, "MMM d, yyyy")}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Day Events Stack */}
                <div className={`flex-1 space-y-1 overflow-y-auto ${isFullscreen ? "max-h-[140px]" : "max-h-[100px]"} scrollbar-none`}>
                  {visibleInterviews
                    .map((item) => {
                      const startTime = format(
                        parseISO(item.scheduled_at),
                        "h:mm a"
                      );
                      const candidateName = getCandidateLabel(item);

                      if (isFullscreen) {
                        return (
                          <button
                            key={item.interview_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openFullscreenDetails(item);
                            }}
                            className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-medium transition-all shadow-2xs truncate flex items-center justify-between gap-1 ${getEventBadgeStyle(
                              item.interview_status
                            )}`}
                          >
                            <span className="truncate font-semibold">
                              <span className="font-bold mr-1">{startTime}</span>
                              {candidateName}
                            </span>
                            {item.interview_format === "ONLINE" ? (
                              <Video className="h-3 w-3 shrink-0 opacity-70" />
                            ) : (
                              <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                            )}
                          </button>
                        );
                      }

                      return (
                        <Popover key={item.interview_id}>
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(item);
                              }}
                              className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-medium transition-all shadow-2xs truncate flex items-center justify-between gap-1 ${getEventBadgeStyle(
                                item.interview_status
                              )}`}
                            >
                              <span className="truncate font-semibold">
                                <span className="font-bold mr-1">{startTime}</span>
                                {candidateName}
                              </span>
                              {item.interview_format === "ONLINE" ? (
                                <Video className="h-3 w-3 shrink-0 opacity-70" />
                              ) : (
                                <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            side="top"
                            align="start"
                            className="w-72 p-3 text-xs space-y-2 shadow-xl border-zinc-200 dark:border-zinc-800"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {startTime} - {candidateName}
                              </span>
                              <InterviewStatusBadge
                                status={item.interview_status}
                              />
                            </div>
                            <div className="text-zinc-500 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                              <span>{item.duration_minutes || 60} mins</span>
                              <span className="capitalize">• {item.interview_format.toLowerCase()}</span>
                            </div>
                            {item.applications && item.applications.length > 0 && (
                              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                                  Candidates ({item.applications.length})
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {item.applications.map((app) => (
                                    <div
                                      key={app.interview_application_id}
                                      className="flex items-center justify-between text-zinc-700 dark:text-zinc-300"
                                    >
                                      <span className="truncate font-medium">
                                        {app.applicant_name || "Applicant"}
                                      </span>
                                      <span className="text-[10px] text-zinc-400">
                                        {app.job_title || "Job"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewDetails(item)}
                                className="h-7 text-[10px] px-2 rounded-md font-semibold"
                              >
                                <Eye className="h-3 w-3 mr-1 text-zinc-500" /> View & Q&A
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenEvaluation(item)}
                                className="h-7 text-[10px] px-2 rounded-md text-emerald-700 dark:text-emerald-300 font-semibold"
                              >
                                <MessageSquare className="h-3 w-3 mr-1 text-emerald-600" />{" "}
                                {item.interview_status === "COMPLETED" ? "View Feedback" : "Feedback"}
                              </Button>
                              {(item.interview_status === "SCHEDULED" ||
                                item.interview_status === "CONFIRMED" ||
                                item.interview_status === "RESCHEDULED") && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onReschedule(item)}
                                    className="h-7 text-[10px] px-2 rounded-md font-semibold text-amber-600 dark:text-amber-400"
                                    title="Reschedule Interview"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1 text-amber-500" /> Reschedule
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenCancelModal(item)}
                                    className="h-7 text-[10px] px-2 rounded-md font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    title="Cancel Interview"
                                  >
                                    <XCircle className="h-3 w-3 mr-1 text-rose-500" /> Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}

                  {/* Overflow badge */}
                  {hasOverflow && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayInterviews({
                          date: day,
                          interviews: dayInterviews,
                        });
                      }}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                    >
                      + {overflowCount} more interviews
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overflow Day Agenda Modal / Popover */}
      <AnimatePresence>
        {selectedDayInterviews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDayInterviews(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-xl md:max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[88vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b pb-3 border-zinc-100 dark:border-zinc-800 shrink-0">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    Interviews on {format(selectedDayInterviews.date, "MMMM d, yyyy")}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedDayInterviews.interviews.length === 0
                      ? "No interviews scheduled"
                      : `${selectedDayInterviews.interviews.length} interview${selectedDayInterviews.interviews.length !== 1 ? "s" : ""} scheduled`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
                  onClick={() => setSelectedDayInterviews(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[62vh]">
                {selectedDayInterviews.interviews.length > 0 ? (
                  selectedDayInterviews.interviews.map((item) => (
                    <div
                      key={item.interview_id}
                      className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span className="font-bold text-sm text-zinc-900 dark:text-white">
                            {format(parseISO(item.scheduled_at), "h:mm a")}
                          </span>
                          <span className="text-xs text-zinc-400 font-normal">
                            ({item.duration_minutes || 60}m · {item.interview_format.toLowerCase()})
                          </span>
                        </div>
                        <InterviewStatusBadge status={item.interview_status} />
                      </div>

                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {getCandidateLabel(item)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDayInterviews(null);
                            if (isFullscreen) {
                              openFullscreenDetails(item);
                            } else {
                              onViewDetails(item);
                            }
                          }}
                          className="h-8 text-xs px-3 rounded-lg font-semibold"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5 text-zinc-500" /> View & Q&A
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDayInterviews(null);
                            if (isFullscreen) {
                              openFullscreenFeedback(item);
                            } else {
                              onOpenEvaluation(item);
                            }
                          }}
                          className="h-8 text-xs px-3 rounded-lg text-emerald-700 dark:text-emerald-300 font-semibold"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Feedback
                        </Button>
                        {(item.interview_status === "SCHEDULED" ||
                          item.interview_status === "CONFIRMED" ||
                          item.interview_status === "RESCHEDULED") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDayInterviews(null);
                                if (isFullscreen) {
                                  openFullscreenReschedule(item);
                                } else {
                                  onReschedule(item);
                                }
                              }}
                              className="h-8 text-xs px-3 rounded-lg font-semibold text-amber-600 dark:text-amber-400"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDayInterviews(null);
                                if (isFullscreen) {
                                  openFullscreenCancel(item);
                                } else {
                                  onOpenCancelModal(item);
                                }
                              }}
                              className="h-8 text-xs px-3 rounded-lg font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-500" /> Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 px-4 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                    <Calendar className="h-9 w-9 mx-auto text-zinc-400 dark:text-zinc-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        No interviews scheduled for this date
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        There are no candidate interview sessions booked for {format(selectedDayInterviews.date, "MMMM d, yyyy")}.
                      </p>
                    </div>
                    {(onScheduleDate || onCreateInterview) && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const dateStr = format(selectedDayInterviews.date, "yyyy-MM-dd");
                            setSelectedDayInterviews(null);
                            if (isFullscreen) {
                              openFullscreenSchedule(dateStr);
                            } else if (onScheduleDate) {
                              onScheduleDate(dateStr);
                            }
                          }}
                          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Schedule Interview on this Date
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FULLSCREEN INLINE MODALS ────────────────────────────────────────── */}

      {/* 1. DETAILS & SCREENING ANSWERS MODAL */}
      <AnimatePresence>
        {isFullscreen && fullscreenModal === "details" && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullscreenModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                      Interview Details & Q&A
                    </h3>
                    <InterviewStatusBadge status={selectedInterview.interview_status} />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {format(parseISO(selectedInterview.scheduled_at), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Overview Info Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {format(parseISO(selectedInterview.scheduled_at), "h:mm a")}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {selectedInterview.duration_minutes || 60} mins ({selectedInterview.timezone || "Asia/Manila"})
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-2">
                  {selectedInterview.interview_format === "ONLINE" ? (
                    <Video className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 capitalize truncate">
                      {selectedInterview.interview_format.toLowerCase()} Interview
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {selectedInterview.meeting_link || selectedInterview.meeting_location || "Standard Slot"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidate Attendees List & Screening Answers */}
              {selectedInterview.applications && selectedInterview.applications.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                    Candidate Attendees ({selectedInterview.applications.length})
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedInterview.applications.map((app) => (
                      <div
                        key={app.interview_application_id}
                        className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                              {app.applicant_name || "Candidate"}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {app.job_title || "Target Position"}
                            </div>
                          </div>
                          {app.attendance_status && (
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {app.attendance_status}
                            </Badge>
                          )}
                        </div>

                        {/* Candidate Screening Responses */}
                        <ScreeningAnswersView screeningAnswers={app.screening_answers} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openFullscreenFeedback(selectedInterview)}
                    className="h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Feedback
                  </Button>

                  {(selectedInterview.interview_status === "SCHEDULED" ||
                    selectedInterview.interview_status === "CONFIRMED" ||
                    selectedInterview.interview_status === "RESCHEDULED") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openFullscreenReschedule(selectedInterview)}
                        className="h-8 text-xs font-semibold text-amber-600 dark:text-amber-400"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1 text-amber-500" /> Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openFullscreenCancel(selectedInterview)}
                        className="h-8 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 text-rose-500" /> Cancel
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFullscreenModal(null)}
                  className="h-8 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SCHEDULE / RESCHEDULE INTERVIEW FORM MODAL */}
      <AnimatePresence>
        {isFullscreen && (fullscreenModal === "schedule" || fullscreenModal === "reschedule") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-2xl md:max-w-3xl lg:max-w-4xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {fullscreenModal === "reschedule"
                    ? "Reschedule Candidate Interview"
                    : "Schedule New Candidate Interview"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <InterviewForm
                data={formData}
                onChange={(field, val) => setFormData((prev) => ({ ...prev, [field]: val }))}
                errors={formErrors}
                disableApplicationId={fullscreenModal === "reschedule"}
                existingInterviews={interviews}
                availableJobs={availableJobs}
                availableApplicants={availableApplicants}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  disabled={isSubmitting || saving}
                  className="h-8 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveInterviewFullscreen}
                  disabled={isSubmitting || saving}
                  className="h-8 text-xs font-semibold bg-[#14a800] hover:bg-[#118f00] text-white border-0"
                >
                  {isSubmitting || saving
                    ? "Saving..."
                    : fullscreenModal === "reschedule"
                    ? "Reschedule Interview"
                    : "Schedule Interview"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. CANDIDATE EVALUATION & FEEDBACK MODAL */}
      <AnimatePresence>
        {isFullscreen && fullscreenModal === "feedback" && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullscreenModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                      Candidate Evaluation & Feedback
                    </h3>
                    {isCompletedEvaluation && (
                      <Badge variant="outline" className="text-[10px] text-purple-600 gap-1">
                        <Lock className="h-3 w-3" /> Read-Only
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {format(parseISO(selectedInterview.scheduled_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Candidate Selector (if batch) */}
              {selectedInterview.applications && selectedInterview.applications.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Candidate</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedInterview.applications.map((app) => (
                      <button
                        key={app.interview_application_id}
                        type="button"
                        onClick={() => {
                          setEvalAppId(app.interview_application_id);
                          setEvalAttendance(app.attendance_status === "NO_SHOW" ? "NO_SHOW" : "ATTENDED");
                          setEvalFeedback(app.feedback || "");
                        }}
                        className={`p-2 rounded-xl text-left border text-xs transition-all ${
                          evalAppId === app.interview_application_id
                            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="truncate">{app.applicant_name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{app.job_title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attendance Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isCompletedEvaluation}
                    onClick={() => setEvalAttendance("ATTENDED")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      evalAttendance === "ATTENDED"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 opacity-60"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500" /> Attended
                  </button>
                  <button
                    type="button"
                    disabled={isCompletedEvaluation}
                    onClick={() => setEvalAttendance("NO_SHOW")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      evalAttendance === "NO_SHOW"
                        ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 opacity-60"
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-500" /> No Show
                  </button>
                </div>
              </div>

              {/* Feedback Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recruiter Feedback & Notes</Label>
                <Textarea
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  disabled={isCompletedEvaluation}
                  placeholder="Enter detailed evaluation notes, strengths, and areas for improvement..."
                  className="text-xs min-h-[100px] rounded-xl"
                />
              </div>

              {/* Decision Status */}
              {!isCompletedEvaluation && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Candidate Recommendation</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEvalDecision("HIRED")}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        evalDecision === "HIRED"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      Recommend Hire
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalDecision("REJECTED")}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        evalDecision === "REJECTED"
                          ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvalDecision("NO_ACTION")}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        evalDecision === "NO_ACTION"
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      Keep Under Review
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  disabled={isSubmitting || saving}
                  className="h-8 text-xs font-semibold"
                >
                  Close
                </Button>
                {!isCompletedEvaluation && (
                  <Button
                    size="sm"
                    onClick={handleSaveEvaluationFullscreen}
                    disabled={isSubmitting || saving}
                    className="h-8 text-xs font-semibold bg-[#14a800] hover:bg-[#118f00] text-white border-0"
                  >
                    {isSubmitting || saving ? "Saving..." : "Save Candidate Evaluation"}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. CANCEL INTERVIEW REASON MODAL */}
      <AnimatePresence>
        {isFullscreen && fullscreenModal === "cancel" && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullscreenModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-card text-card-foreground border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4" /> Cancel Interview
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {format(parseISO(selectedInterview.scheduled_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {cancelError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {cancelError}
                </div>
              )}

              {/* Reason Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Cancellation Reason</Label>
                <div className="space-y-1.5">
                  {COMMON_CANCEL_REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        cancelReason === r
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel_reason"
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        className="accent-indigo-600"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {cancelReason === "Other reason" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Custom Cancellation Reason</Label>
                  <Textarea
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Please specify why this interview is being cancelled..."
                    className="text-xs min-h-[80px] rounded-xl"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenModal(null)}
                  disabled={isSubmitting || saving}
                  className="h-8 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmCancelFullscreen}
                  disabled={isSubmitting || saving}
                  className="h-8 text-xs font-semibold"
                >
                  {isSubmitting || saving ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
