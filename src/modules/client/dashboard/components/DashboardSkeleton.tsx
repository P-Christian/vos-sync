// src/modules/client/dashboard/components/DashboardSkeleton.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-28 rounded-2xl border bg-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded-md" />
            <div className="h-4 w-32 bg-muted/60 rounded-md" />
          </div>
        </div>
        <div className="h-10 w-28 bg-muted rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border bg-card p-5 rounded-2xl py-0">
            <CardContent className="p-0 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-8 rounded-xl bg-muted" />
              </div>
              <div className="space-y-1.5">
                <div className="h-8 w-16 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted/60 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card className="border bg-card rounded-2xl p-6">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted/60 rounded" />
          </div>
          <div className="h-8 w-44 bg-muted rounded-xl" />
        </CardHeader>
        <div className="h-[260px] bg-muted/30 rounded-xl" />
      </Card>

      {/* 2x2 Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border bg-card rounded-2xl p-5 min-h-[300px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/40">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted/60 rounded" />
              </div>
              <div className="space-y-3">
                <div className="h-12 bg-muted/30 rounded-xl" />
                <div className="h-12 bg-muted/30 rounded-xl" />
                <div className="h-12 bg-muted/30 rounded-xl" />
              </div>
            </div>
            <div className="h-8 bg-muted/20 rounded-lg mt-4" />
          </Card>
        ))}
      </div>
    </div>
  );
}
