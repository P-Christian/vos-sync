// src/modules/vos-admin/components/dashboard/AdminVelocityChart.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { VerificationVelocityPoint } from '../../types/dashboard';

interface AdminVelocityChartProps {
  data: VerificationVelocityPoint[];
  isLoading?: boolean;
}

export function AdminVelocityChart({ data, isLoading = false }: AdminVelocityChartProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/80 shadow-xs h-[360px] animate-pulse">
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded mb-2" />
          <div className="h-3 w-60 bg-muted rounded" />
        </CardHeader>
        <CardContent className="h-[240px] flex items-center justify-center">
          <div className="h-40 w-full bg-muted/40 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between">
      <CardHeader className="min-h-[72px] pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Platform Growth & Velocity
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Monthly expansion of partner companies, schools, and talent registrations
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Companies
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Schools
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              Users
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-0">
        <div className="h-[230px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adminColorCompanies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="adminColorSchools" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="adminColorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-lg">
                        <p className="text-xs font-semibold text-popover-foreground mb-1.5">{label}</p>
                        <div className="space-y-1 text-xs">
                          <p className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400">
                            <span>Companies:</span>
                            <span className="font-bold">{payload[0]?.value ?? 0}</span>
                          </p>
                          <p className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span>Institutions:</span>
                            <span className="font-bold">{payload[1]?.value ?? 0}</span>
                          </p>
                          <p className="flex items-center justify-between gap-4 text-indigo-600 dark:text-indigo-400">
                            <span>Active Users:</span>
                            <span className="font-bold">{payload[2]?.value ?? 0}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="companies"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adminColorCompanies)"
              />
              <Area
                type="monotone"
                dataKey="schools"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adminColorSchools)"
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#adminColorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span>Reporting Window: <strong>Current Academic Year</strong></span>
          <span className="font-semibold text-foreground">Verified ecosystem pipeline</span>
        </div>
      </CardContent>
    </Card>
  );
}
