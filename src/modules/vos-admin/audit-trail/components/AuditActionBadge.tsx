// src/modules/vos-admin/audit-trail/components/AuditActionBadge.tsx
import React from 'react';
import { AuditAction } from '../types/audit.types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AuditActionBadgeProps {
  action: AuditAction | string;
}

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  const normalized = (action || '').toUpperCase();

  let styles = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";

  switch (normalized) {
    case 'CREATE':
      styles = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      break;
    case 'UPDATE':
      styles = "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      break;
    case 'DELETE':
      styles = "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800";
      break;
    case 'LOGIN':
      styles = "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      break;
    case 'LOGOUT':
      styles = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      break;
    case 'VERIFY':
      styles = "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      break;
    case 'REJECT':
      styles = "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      break;
    case 'EXPORT':
      styles = "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      break;
    case 'SUBMIT':
      styles = "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800";
      break;
    case 'PUBLISH':
      styles = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      break;
  }

  return (
    <Badge variant="outline" className={cn("font-medium px-2 py-0.5 text-xs rounded-md shadow-2xs", styles)}>
      {normalized}
    </Badge>
  );
}
