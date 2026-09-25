// src/modules/school-admin/success-metrics/components/MetricsKpiCards.tsx
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricKpiData } from '../types/success-metrics.types';
import { Award, Briefcase, TrendingUp } from 'lucide-react';

interface MetricsKpiCardsProps {
  kpis: MetricKpiData;
}

export function MetricsKpiCards({ kpis }: MetricsKpiCardsProps) {
  const cards = [
    {
      title: 'Overall Placement Rate',
      value: `${kpis.placementRate}%`,
      subtitle: `${kpis.hiredCount} hired of ${kpis.registeredStudents} registered`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'In-Progress Applications',
      value: `${kpis.activePipelineCount}`,
      subtitle: `${kpis.activePipelineRate}% of registered candidates`,
      icon: Briefcase,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Top Performing Course',
      value: kpis.topPerformingCourse || 'N/A',
      subtitle: 'Highest graduate placement rate',
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className="py-0 gap-0 border shadow-xs transition-all hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</p>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${card.bgColor} ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-bold tracking-tight text-foreground truncate" title={card.value}>
                  {card.value}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground truncate" title={card.subtitle}>
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

