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

  let styles = "";

  switch (normalized) {
    case 'CREATE':
    case 'POST':
      styles = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      break;
    case 'UPDATE':
    case 'EDIT':
      styles = "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      break;
    case 'DELETE':
    case 'DOC_DELETE':
      styles = "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800";
      break;
    case 'LOGIN':
      styles = "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      break;
    case 'LOGOUT':
      styles = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      break;
    case 'FAILED_LOGIN':
    case 'LOCKOUT':
      styles = "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      break;
    case 'VERIFY':
    case 'OTP_VERIFY':
      styles = "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      break;
    case 'REJECT':
      styles = "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      break;
    case 'EXPORT':
      styles = "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      break;
    case 'SUBMIT':
    case 'DOC_UPLOAD':
      styles = "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800";
      break;
    case 'PUBLISH':
      styles = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      break;
    case 'PASSWORD_RESET':
    case 'ACCOUNT_RECOVERY':
    case 'ROLE_ASSIGN':
    case 'ROLE_REVOKE':
    case 'PERMISSION_CHANGE':
      styles = "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      break;
    case 'SCHEDULE':
    case 'OFFER_SENT':
      styles = "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      break;
    case 'LEGAL_HOLD':
    case 'OVERRIDE':
    case 'RETENTION_CHANGE':
    case 'CONFIG_CHANGE':
      styles = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700";
      break;
  }

  return (
    <Badge variant="outline" className={cn("font-medium px-2 py-0.5 text-xs rounded-md shadow-2xs", styles)}>
      {normalized}
    </Badge>
  );
}
