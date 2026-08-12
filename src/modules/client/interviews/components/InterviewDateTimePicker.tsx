"use client";

// src/modules/client/interviews/components/InterviewDateTimePicker.tsx

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Interview } from "../types";
import { Button } from "@/components/ui/button";
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
  return `Interview #${iv.interview_id}`;
}

function formatYYYYMMDD(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseValue(val: string): { year: number; month: number; day: number; time: string; valid: boolean } {
  if (!val) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      time: "09:00",
      valid: false,
    };
  }

  const parts = val.split("T");
  if (parts.length >= 2) {
    const dateParts = parts[0].split("-");
    const timeParts = parts[1].slice(0, 5);
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day, time: timeParts, valid: true };
      }
    }
  }

  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    time: "09:00",
    valid: false,
  };
}

function formatTimeRange(startISO: string, durationMins: number = 60): string {
  try {
    const d = new Date(startISO.replace(" ", "T"));
    if (isNaN(d.getTime())) return startISO;
    const startStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const end = new Date(d.getTime() + durationMins * 60 * 1000);
    const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${startStr} - ${endStr}`;
  } catch {
    return startISO;
  }
}

export default function InterviewDateTimePicker({
  value,
  onChange,
  durationMinutes = 60,
  scheduledDatesSet = new Set(),
  existingInterviews = [],
  getSlotStatus,
  hasConflict,
}: InterviewDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hoveredYMD, setHoveredYMD] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseValue(value), [value]);

  // Calendar month / year navigation state
  const [currentYear, setCurrentYear] = useState<number>(parsed.year);
  const [currentMonth, setCurrentMonth] = useState<number>(parsed.month);

  // Close when clicking outside picker
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Update view when value changes externally
  useEffect(() => {
    if (parsed.valid) {
      queueMicrotask(() => {
        setCurrentYear((prev) => (prev !== parsed.year ? parsed.year : prev));
        setCurrentMonth((prev) => (prev !== parsed.month ? parsed.month : prev));
      });
    }
  }, [parsed.year, parsed.month, parsed.valid]);

  const selectedYMD = useMemo(() => {
    return formatYYYYMMDD(parsed.year, parsed.month, parsed.day);
  }, [parsed.year, parsed.month, parsed.day]);

  // Map of existing interviews grouped by YYYY-MM-DD
  const interviewsByDateMap = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const iv of existingInterviews) {
      if (!iv.scheduled_at) continue;
      const datePart = iv.scheduled_at.split("T")[0].split(" ")[0];
      const list = map.get(datePart) || [];
      list.push(iv);
      map.set(datePart, list);
    }
    return map;
  }, [existingInterviews]);

  // Format display label
  const displayLabel = useMemo(() => {
    if (!parsed.valid || !value) {
      return "Select Date & Time Slot...";
    }
    try {
      const d = new Date(value.replace(" ", "T"));
      if (isNaN(d.getTime())) return value;
      const dateFormatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const startFormatted = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const end = new Date(d.getTime() + durationMinutes * 60 * 1000);
      const endFormatted = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${dateFormatted} · ${startFormatted} - ${endFormatted}`;
    } catch {
      return value;
    }
  }, [value, durationMinutes, parsed.valid]);

  // Generate calendar grid cells (42 cells: 6 rows of 7 days)
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
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
    <div ref={pickerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full h-10 px-3 justify-between text-left text-xs font-semibold rounded-xl transition-all cursor-pointer",
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="calendar-picker-accordion"
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              transition: {
                height: { duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2, delay: 0.05 },
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              transition: {
                height: { duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 },
              },
            }}
            className="w-full overflow-hidden"
          >
            <div className="pt-2.5 pb-0.5">
              <div className="w-full p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* LEFT SIDE: Month Calendar Grid */}
                  <div className="md:w-1/2 space-y-3">
                    {/* Month / Year Navigation */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
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
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                                className={cn(
                                  "h-8 w-full rounded-lg text-xs font-semibold relative flex flex-col items-center justify-center transition-all cursor-pointer",
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
                              </motion.button>

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
                  <div className="md:w-1/2 md:border-l md:border-zinc-200/80 md:dark:border-zinc-800 md:pl-6 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
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
                          <motion.button
                            key={timeSlot}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelectTime(timeSlot)}
                            className={cn(
                              "w-full h-8 text-[11px] px-2 font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer border",
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
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setOpen(false)}
                        className="h-8 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        Confirm & Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
