"use client";

// src/modules/client/interviews/components/InterviewBigCalendar.tsx

import React, { useState, useMemo } from "react";
import { Interview, InterviewStatus } from "../types";
import InterviewStatusBadge from "./InterviewStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  Eye,
  MessageSquare,
  RefreshCw,
  XCircle,
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
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InterviewBigCalendarProps {
  interviews: Interview[];
  onViewDetails: (interview: Interview) => void;
  onOpenEvaluation: (interview: Interview) => void;
  onReschedule: (interview: Interview) => void;
  onOpenCancelModal: (interview: Interview) => void;
  onScheduleDate?: (dateStr: string) => void;
}

export default function InterviewBigCalendar({
  interviews,
  onViewDetails,
  onOpenEvaluation,
  onReschedule,
  onOpenCancelModal,
  onScheduleDate,
}: InterviewBigCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayInterviews, setSelectedDayInterviews] = useState<{
    date: Date;
    interviews: Interview[];
  } | null>(null);

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
        return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100";
      case "CONFIRMED":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100";
      case "RESCHEDULED":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100";
      case "COMPLETED":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100";
      case "CANCELLED":
      case "NO_SHOW":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 line-through opacity-70";
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

  return (
    <div className="space-y-4">
      {/* Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
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

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Rescheduled
          </span>
          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            Completed
          </span>
        </div>
      </div>

      {/* Calendar Main Grid Container */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/60 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 py-2.5">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/10">
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayInterviews = interviewsByDate.get(dateKey) || [];
            const isCurrentMonthDay = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const MAX_VISIBLE_EVENTS = 3;
            const overflowCount = dayInterviews.length - MAX_VISIBLE_EVENTS;

            return (
              <div
                key={dateKey}
                className={`min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors relative group ${
                  !isCurrentMonthDay
                    ? "bg-zinc-100/40 dark:bg-zinc-900/20 text-zinc-400 dark:text-zinc-600"
                    : "bg-white dark:bg-zinc-950"
                } ${isTodayDate ? "ring-2 ring-indigo-500/40 dark:ring-indigo-500/50 z-10" : ""}`}
              >
                {/* Day Header Row */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
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
                  {onScheduleDate && (
                    <button
                      onClick={() => onScheduleDate(format(day, "yyyy-MM-dd"))}
                      title={`Schedule interview on ${format(day, "MMM d, yyyy")}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Day Events Stack */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] scrollbar-none">
                  {dayInterviews
                    .slice(0, MAX_VISIBLE_EVENTS)
                    .map((item) => {
                      const startTime = format(
                        parseISO(item.scheduled_at),
                        "h:mm a"
                      );
                      const candidateName = getCandidateLabel(item);

                      return (
                        <Popover key={item.interview_id}>
                          <PopoverTrigger asChild>
                            <button
                              onClick={() => onViewDetails(item)}
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
                  {overflowCount > 0 && (
                    <button
                      onClick={() =>
                        setSelectedDayInterviews({
                          date: day,
                          interviews: dayInterviews,
                        })
                      }
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
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
      {selectedDayInterviews && (
        <Popover
          open={!!selectedDayInterviews}
          onOpenChange={(open) => !open && setSelectedDayInterviews(null)}
        >
          <PopoverContent className="w-88 p-4 space-y-3 shadow-2xl border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b pb-2 border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Interviews on {format(selectedDayInterviews.date, "MMMM d, yyyy")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedDayInterviews(null)}
              >
                <XCircle className="h-4 w-4 text-zinc-400" />
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selectedDayInterviews.interviews.map((item) => (
                <div
                  key={item.interview_id}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white">
                      {format(parseISO(item.scheduled_at), "h:mm a")}
                    </span>
                    <InterviewStatusBadge status={item.interview_status} />
                  </div>
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    {getCandidateLabel(item)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onViewDetails(item);
                        setSelectedDayInterviews(null);
                      }}
                      className="h-7 text-[10px] px-2 rounded-md font-semibold"
                    >
                      <Eye className="h-3 w-3 mr-1 text-zinc-500" /> View & Q&A
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpenEvaluation(item);
                        setSelectedDayInterviews(null);
                      }}
                      className="h-7 text-[10px] px-2 rounded-md text-emerald-700 dark:text-emerald-300 font-semibold"
                    >
                      <MessageSquare className="h-3 w-3 mr-1 text-emerald-600" /> Feedback
                    </Button>
                    {(item.interview_status === "SCHEDULED" ||
                      item.interview_status === "CONFIRMED" ||
                      item.interview_status === "RESCHEDULED") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onReschedule(item);
                            setSelectedDayInterviews(null);
                          }}
                          className="h-7 text-[10px] px-2 rounded-md font-semibold text-amber-600 dark:text-amber-400"
                        >
                          <RefreshCw className="h-3 w-3 mr-1 text-amber-500" /> Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenCancelModal(item);
                            setSelectedDayInterviews(null);
                          }}
                          className="h-7 text-[10px] px-2 rounded-md font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                        >
                          <XCircle className="h-3 w-3 mr-1 text-rose-500" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
