"use client";

// src/modules/client/interviews/components/InterviewDateTimePicker.tsx

import React, { useState, useMemo } from "react";
import { Interview, INTERVIEW_FORMAT_LABELS } from "../types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle,
  Calendar as CalendarIcon,
  User,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewDateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" format
  onChange: (val: string) => void;
  durationMinutes?: number;
  scheduledDatesSet?: Set<string>;
  existingInterviews?: Interview[];
  dateInterviews?: Interview[];
  getSlotStatus?: (timeSlot: string) => { isBooked: boolean; booking?: Interview };
  hasConflict?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generate time slots from 08:00 AM to 06:00 PM (30-min intervals)
const TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 18; hour++) {
    const h = String(hour).padStart(2, "0");
    slots.push(`${h}:00`);
    if (hour < 18) slots.push(`${h}:30`);
  }
  return slots;
})();

export function getInterviewDisplayLabel(iv: Interview): string {
  const apps = iv.applications ?? [];
  if (apps.length > 0 && apps[0].applicant_name) {
    const mainName = apps[0].applicant_name;
    if (apps.length > 1) {
      return `${mainName} (+${apps.length - 1} candidates)`;
    }
    return mainName;
  }
  if (apps.length > 0 && apps[0].job_title) {
    return `Candidate for ${apps[0].job_title}`;
  }
  return "Scheduled Candidate";
}

function parseDateStr(dateStr?: string): { year: number; month: number; day: number; time: string } {
  if (!dateStr) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      time: "09:00",
    };
  }

  const norm = dateStr.replace(" ", "T");
  const parts = norm.split("T");
  const ymd = parts[0].split("-");
  const timePart = parts[1] ? parts[1].slice(0, 5) : "09:00";

  if (ymd.length === 3) {
    return {
      year: Number(ymd[0]),
      month: Number(ymd[1]) - 1,
      day: Number(ymd[2]),
      time: timePart,
    };
  }

  const d = new Date(norm);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    time: "09:00",
  };
}

function formatYYYYMMDD(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

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

export default function InterviewDateTimePicker({
  value,
  onChange,
  durationMinutes = 60,
  scheduledDatesSet = new Set(),
  existingInterviews = [],
  getSlotStatus,
  hasConflict = false,
}: InterviewDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hoveredYMD, setHoveredYMD] = useState<string | null>(null);

  const parsed = useMemo(() => parseDateStr(value), [value]);

  const [currentYear, setCurrentYear] = useState<number>(parsed.year);
  const [currentMonth, setCurrentMonth] = useState<number>(parsed.month);

  const selectedYMD = useMemo(() => {
    return formatYYYYMMDD(parsed.year, parsed.month, parsed.day);
  }, [parsed]);

  // Display label on trigger button
  const displayLabel = useMemo(() => {
    if (!value) return "Select Scheduled Date & Time...";
    try {
      const norm = value.replace(" ", "T");
      const d = new Date(norm);
      if (isNaN(d.getTime())) return value;

      const datePart = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${datePart} at ${timePart}`;
    } catch {
      return value;
    }
  }, [value]);

  // Map of interviews by YYYY-MM-DD for fast hover lookup
  const interviewsByDateMap = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const iv of existingInterviews) {
      if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(iv.interview_status)) continue;
      const d = extractDateStr(iv.scheduled_at);
      if (d) {
        const existing = map.get(d) || [];
        map.set(d, [...existing, iv]);
      }
    }
    return map;
  }, [existingInterviews]);

  // Days matrix for currentMonth and currentYear
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells: Array<{ year: number; month: number; day: number; isCurrentMonth: boolean }> = [];

    // Prev month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        day: prevMonthDays - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        year: currentYear,
        month: currentMonth,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        day: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const ymd = formatYYYYMMDD(year, month, day);
    const currentTime = parsed.time || "09:00";
    onChange(`${ymd}T${currentTime}`);
  };

  const handleSelectTime = (timeSlot: string) => {
    const ymd = selectedYMD;
    onChange(`${ymd}T${timeSlot}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-10 px-3 justify-between text-left text-xs font-semibold rounded-xl transition-all",
            hasConflict
              ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300"
              : value
              ? "border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              : "text-zinc-400"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </div>
          {scheduledDatesSet.size > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-500 shrink-0 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              {scheduledDatesSet.size} dates booked
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[560px] sm:w-[620px] max-w-[95vw] p-4 shadow-2xl rounded-2xl border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* LEFT SIDE: Month Calendar Grid */}
          <div className="sm:w-1/2 space-y-3">
            {/* Month / Year Navigation */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </Button>

              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>

              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </Button>
            </div>

            {/* Custom Calendar Grid */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 text-center">
                {WEEKDAY_NAMES.map((wd) => (
                  <span key={wd} className="text-[10px] font-bold text-zinc-400 uppercase py-1">
                    {wd}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((cell, idx) => {
                  const ymd = formatYYYYMMDD(cell.year, cell.month, cell.day);
                  const isSelected = ymd === selectedYMD;
                  const dayInterviews = interviewsByDateMap.get(ymd) || [];
                  const hasInterview = dayInterviews.length > 0 || scheduledDatesSet.has(ymd);

                  return (
                    <div
                      key={idx}
                      className="relative group"
                      onMouseEnter={() => setHoveredYMD(ymd)}
                      onMouseLeave={() => setHoveredYMD(null)}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                        className={cn(
                          "h-8 w-full rounded-lg text-xs font-semibold relative flex flex-col items-center justify-center transition-all",
                          !cell.isCurrentMonth && "text-zinc-300 dark:text-zinc-700 opacity-40",
                          cell.isCurrentMonth && "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          isSelected && "bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
                        )}
                      >
                        <span>{cell.day}</span>
                        {/* RED INDICATOR DOT for dates with booked interviews */}
                        {hasInterview && (
                          <span
                            className={cn(
                              "absolute bottom-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2",
                              isSelected ? "ring-indigo-600" : "ring-white dark:ring-zinc-950"
                            )}
                          />
                        )}
                      </button>

                      {/* HOVER TOOLTIP: Show scheduled candidate details on date cell hover */}
                      {hoveredYMD === ymd && dayInterviews.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-zinc-950 text-white text-[11px] rounded-xl shadow-2xl z-50 pointer-events-none space-y-1.5 border border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
                          <div className="font-bold text-rose-400 flex items-center justify-between border-b border-zinc-800 pb-1">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Booked on {ymd}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-normal">({dayInterviews.length})</span>
                          </div>
                          {dayInterviews.map((iv) => (
                            <div key={iv.interview_id} className="space-y-0.5 pt-0.5 text-zinc-300">
                              <p className="font-bold text-white flex items-center gap-1">
                                <User className="h-3 w-3 text-indigo-400 shrink-0" />
                                <span className="truncate">{getInterviewDisplayLabel(iv)}</span>
                              </p>
                              {iv.applications?.[0]?.job_title && (
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                  <Briefcase className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{iv.applications[0].job_title}</span>
                                </p>
                              )}
                              <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{formatTimeRange(iv.scheduled_at, iv.duration_minutes)}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Time Slot Picker Grid */}
          <div className="sm:w-1/2 sm:border-l sm:border-zinc-100 sm:dark:border-zinc-800 sm:pl-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Select Time Slot
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold">{selectedYMD}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1 pr-2">
              {TIME_SLOTS.map((timeSlot) => {
                const status = getSlotStatus ? getSlotStatus(timeSlot) : { isBooked: false };
                const isSelected = parsed.time === timeSlot;

                if (status.isBooked && status.booking) {
                  return (
                    <div key={timeSlot} className="relative group">
                      <Button
                        disabled
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-[11px] px-2 font-semibold rounded-lg border-rose-200 bg-rose-50/60 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400 cursor-not-allowed opacity-80 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <Lock className="h-3 w-3 shrink-0 text-rose-500" />
                          <span className="truncate">{timeSlot}</span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 shrink-0">Booked</span>
                      </Button>
                    </div>
                  );
                }

                return (
                  <Button
                    key={timeSlot}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleSelectTime(timeSlot)}
                    className={cn(
                      "w-full h-8 text-[11px] px-2 font-semibold rounded-lg transition-all flex items-center justify-between",
                      isSelected
                        ? "bg-amber-500 hover:bg-amber-600 text-white font-bold border-amber-600 shadow-2xs"
                        : "border-emerald-200/80 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 shrink-0" />
                      <span>{timeSlot}</span>
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-white">Selected</span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-end">
              <Button
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
