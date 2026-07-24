"use client";

import React from 'react';
import { ApplicationSummary } from '../types';
import { TrendingUp, MessageSquare, Briefcase } from 'lucide-react';

interface Props {
  summary: ApplicationSummary;
}

export const ApplicationSummaryCards: React.FC<Props> = ({ summary }) => {
  const cards = [
    {
      label: 'Total Applied',
      value: String(summary.totalApplied),
      icon: TrendingUp,
    },
    {
      label: 'Interviewing',
      value: summary.interviewing.toString().padStart(2, '0'),
      icon: MessageSquare,
    },
    {
      label: 'Active Offers',
      value: summary.activeOffers.toString().padStart(2, '0'),
      icon: Briefcase,
    },
  ];

  return (
    <div className="flex flex-row flex-nowrap gap-4 mb-6 w-full overflow-x-auto">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex-1 flex flex-col p-6 gap-3 rounded-xl border bg-card shadow-sm min-w-[200px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="text-4xl font-bold text-foreground">{value}</div>
        </div>
      ))}
    </div>
  );
};
