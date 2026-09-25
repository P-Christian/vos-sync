// src/modules/school-admin/success-metrics/components/CourseComparisonChart.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CoursePlacementStat } from '../types/success-metrics.types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface CourseComparisonChartProps {
  courseStats: CoursePlacementStat[];
}

export function CourseComparisonChart({ courseStats }: CourseComparisonChartProps) {
  // Sort courses with highest registered count or placement rate
  const displayStats = courseStats
    .filter((c) => c.totalStudents > 0 || c.registeredStudents > 0)
    .slice(0, 8);

  const chartData = displayStats.map((c) => ({
    name: c.courseCode || (c.courseName.length > 18 ? `${c.courseName.slice(0, 16)}...` : c.courseName),
    fullName: c.courseName,
    Registered: c.registeredStudents,
    Hired: c.hiredCount,
    Pipeline: c.activePipelineCount,
    Rate: c.placementRate,
  }));

  return (
    <Card className="border shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">Placement by Academic Program</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Comparing registered students against hired graduates across degree programs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {chartData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No course data found for the selected filter.
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.2, rx: 6 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                          <p className="text-xs font-semibold text-popover-foreground">{d.fullName}</p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p className="flex justify-between gap-4">
                              <span>Registered Students:</span>
                              <span className="font-semibold text-foreground">{d.Registered}</span>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span>Hired Graduates:</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{d.Hired}</span>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span>Interview Pipeline:</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{d.Pipeline}</span>
                            </p>
                            <p className="flex justify-between gap-4 border-t border-border pt-1.5 font-medium">
                              <span className="text-foreground">Placement Rate:</span>
                              <span className="font-bold text-foreground">{d.Rate}%</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                  formatter={(value) => <span className="text-xs font-medium text-muted-foreground">{value}</span>}
                />
                <Bar dataKey="Registered" fill="#64748b" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="Hired" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="Pipeline" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
