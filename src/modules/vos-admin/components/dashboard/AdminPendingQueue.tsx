// src/modules/vos-admin/components/dashboard/AdminPendingQueue.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, GraduationCap, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import type { PendingActionItem } from '../../types/dashboard';

interface AdminPendingQueueProps {
  items: PendingActionItem[];
  isLoading?: boolean;
}

export function AdminPendingQueue({ items, isLoading = false }: AdminPendingQueueProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/80 shadow-xs h-full animate-pulse">
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded mb-2" />
          <div className="h-3 w-64 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full bg-muted/40 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'Pending review';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <Card className="rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between h-full">
      <CardHeader className="min-h-[72px] pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Action Required Queue
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              High-priority verification submissions awaiting administrator decision
            </CardDescription>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {items.length} Pending
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">All queues cleared</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No pending entity verifications require review at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const isCompany = item.type === 'COMPANY';
              const Icon = isCompany ? Building2 : GraduationCap;
              const typeColor = isCompany
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center ${typeColor}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-[260px]">
                          {item.name}
                        </p>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(item.submittedAt)}</span>
                    </div>

                    <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-lg px-2.5">
                      <Link href={item.reviewUrl}>
                        <span>Review</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href="/vos-sync/vos-admin/company-verification"
            className="hover:text-primary transition-colors font-medium flex items-center gap-1"
          >
            All Companies <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/vos-sync/vos-admin/school-verification"
            className="hover:text-primary transition-colors font-medium flex items-center gap-1"
          >
            All Schools <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
