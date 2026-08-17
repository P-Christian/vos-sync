// src/modules/client/dashboard/components/HiringOverviewChart.tsx
"use client";

import React, { useState, useMemo } from "react";
import { HiringOverviewChartData, TimeRangeKey } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

interface HiringOverviewChartProps {
  chartData?: HiringOverviewChartData;
}

const INTERVALS: { key: TimeRangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
];

export default function HiringOverviewChart({ chartData }: HiringOverviewChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>("30d");

  const currentData = useMemo(() => {
    if (!chartData || !chartData[selectedRange]) {
      return [];
    }
    return chartData[selectedRange];
  }, [chartData, selectedRange]);

  const totalInPeriod = useMemo(() => {
    return currentData.reduce((acc, curr) => acc + (curr.applications || 0), 0);
  }, [currentData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border bg-card rounded-2xl shadow-2xs overflow-hidden py-0">
        <CardHeader className="p-5 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-foreground">Hiring Overview</CardTitle>
              <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                <TrendingUp className="h-3 w-3" /> Trending Up
              </span>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Total of <strong className="text-foreground font-semibold">{totalInPeriod} applications</strong> logged in this window.
            </CardDescription>
          </div>

          {/* Time range switcher with Framer Motion pill */}
          <div className="flex items-center p-1 bg-muted rounded-xl border border-border/60 self-start sm:self-auto overflow-x-auto max-w-full">
            {INTERVALS.map((interval) => {
              const isActive = selectedRange === interval.key;
              return (
                <button
                  key={interval.key}
                  onClick={() => setSelectedRange(interval.key)}
                  className="relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap z-10"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeChartTab"
                      className="absolute inset-0 bg-background rounded-lg shadow-xs border border-border/40"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-20 ${isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                    {interval.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-4">
          <div className="h-[260px] sm:h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="applicationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="shortlistGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border bg-popover p-3 shadow-lg text-xs space-y-1.5">
                          <p className="font-semibold text-popover-foreground flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            {label}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              Applications:
                            </span>
                            <span className="font-bold text-popover-foreground">{payload[0]?.value}</span>
                          </div>
                          {payload[1] && (
                            <div className="flex items-center justify-between gap-4 text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-foreground/60" />
                                Shortlisted:
                              </span>
                              <span className="font-bold text-popover-foreground">{payload[1]?.value}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#applicationGradient)"
                  animationDuration={500}
                />
                {currentData[0]?.shortlisted !== undefined && (
                  <Area
                    type="monotone"
                    dataKey="shortlisted"
                    name="Shortlisted"
                    stroke="var(--foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#shortlistGradient)"
                    animationDuration={500}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
