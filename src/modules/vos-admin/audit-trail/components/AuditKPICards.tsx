// src/modules/vos-admin/audit-trail/components/AuditKPICards.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AuditKPIData } from '../types/audit.types';
import { Activity, AlertOctagon, ShieldAlert, UserCheck } from 'lucide-react';

interface AuditKPICardsProps {
  kpis: AuditKPIData;
  loading?: boolean;
}

export function AuditKPICards({ kpis, loading }: AuditKPICardsProps) {
  const cards = [
    {
      title: "Today's Audit Events",
      value: kpis.todayEvents,
      icon: Activity,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      description: "Total recorded events today",
    },
    {
      title: "Failed Events",
      value: kpis.failedEvents,
      icon: AlertOctagon,
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      description: "System or action execution errors",
    },
    {
      title: "Denied Access",
      value: kpis.deniedAccess,
      icon: ShieldAlert,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      description: "Unauthorized access attempts",
    },
    {
      title: "Admin Actions",
      value: kpis.adminActions,
      icon: UserCheck,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      description: "Administrative interventions today",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="shadow-2xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {card.title}
                </p>
                <div className="text-2xl font-bold mt-1 tracking-tight">
                  {loading ? (
                    <span className="animate-pulse text-muted-foreground">---</span>
                  ) : (
                    card.value.toLocaleString()
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {card.description}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg} shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
