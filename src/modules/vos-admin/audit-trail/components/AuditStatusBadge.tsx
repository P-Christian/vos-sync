// src/modules/vos-admin/audit-trail/components/AuditStatusBadge.tsx
import React from 'react';
import { AuditStatus } from '../types/audit.types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditStatusBadgeProps {
  status: AuditStatus | string;
}

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'SUCCESS':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 px-2 py-0.5 text-xs font-medium rounded-md">
          <CheckCircle2 className="h-3 w-3" /> SUCCESS
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800 gap-1 px-2 py-0.5 text-xs font-medium rounded-md">
          <XCircle className="h-3 w-3" /> FAILED
        </Badge>
      );
    case 'DENIED':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 px-2 py-0.5 text-xs font-medium rounded-md">
          <AlertTriangle className="h-3 w-3" /> DENIED
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs font-medium rounded-md">
          {normalized}
        </Badge>
      );
  }
}
