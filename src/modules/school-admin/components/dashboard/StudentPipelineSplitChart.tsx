// src/modules/school-admin/components/dashboard/StudentPipelineSplitChart.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { FunnelStageStat } from '../../success-metrics/types/success-metrics.types';

interface PipelineStage {
  name: string;
  count: number;
  color: string;
}

interface StudentPipelineSplitChartProps {
  totalStudents?: number;
  funnelStages?: FunnelStageStat[];
}

const STAGE_COLORS: Record<string, string> = {
  APPLIED: '#3b82f6',
  UNDER_REVIEW: '#6366f1',
  SHORTLISTED: '#8b5cf6',
  INTERVIEWING: '#f59e0b',
  HIRED: '#10b981',
};

export function StudentPipelineSplitChart({
  totalStudents = 0,
  funnelStages = [],
}: StudentPipelineSplitChartProps) {
  const hasRealData = funnelStages.some((s) => s.count > 0);

  const data: PipelineStage[] = hasRealData
    ? funnelStages.map((s) => ({
        name: s.label,
        count: s.count,
        color: STAGE_COLORS[s.stage] || '#94a3b8',
      }))
    : [
        { name: 'Enrolled', count: totalStudents, color: '#3b82f6' },
        { name: 'Under Review', count: 0, color: '#6366f1' },
        { name: 'Interviewing', count: 0, color: '#f59e0b' },
        { name: 'Hired / Placed', count: 0, color: '#10b981' },
      ];

  const totalActionCount = data.reduce((acc, curr) => acc + curr.count, 0);
  const hiredCount = funnelStages.find((s) => s.stage === 'HIRED')?.count || 0;
  const placementRate =
    totalStudents > 0 ? ((hiredCount / totalStudents) * 100).toFixed(1) : '0.0';

  return (
    <Card className="h-full rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between">
      <CardHeader className="min-h-[72px] pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Candidate Pipeline Split
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {totalStudents} registered students in institution roster
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-[210px]">
          {/* Donut with center score */}
          <div className="relative h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as PipelineStage;
                      const pct = totalActionCount > 0 ? Math.round((item.count / totalActionCount) * 100) : 0;
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 p-2 text-xs shadow-md">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {item.count} candidates ({pct}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={data.filter(d => d.count > 0).length > 1 ? 4 : 0}
                  dataKey="count"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-foreground">{placementRate}%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Placement
              </span>
            </div>
          </div>

          {/* Right: Legend Breakdown */}
          <div className="w-full space-y-2 text-xs">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-semibold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span>Actual placed candidates</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {hiredCount} Hired ({placementRate}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
