// src/modules/vos-admin/audit-trail/components/AuditStatusBadge.tsx
"use client";

import React from 'react';
import { AuditStatus } from '../types/audit.types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuditStatusBadgeProps {
  status: AuditStatus | string;
}

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  const renderBadge = () => {
    switch (normalized) {
      case 'SUCCESS':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 px-2 py-0.5 text-xs font-medium rounded-md shadow-2xs">
            <CheckCircle2 className="h-3 w-3" /> SUCCESS
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 px-2 py-0.5 text-xs font-medium rounded-md shadow-2xs">
            <XCircle className="h-3 w-3" /> FAILED
          </Badge>
        );
      case 'DENIED':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 px-2 py-0.5 text-xs font-medium rounded-md shadow-2xs">
            <AlertTriangle className="h-3 w-3" /> DENIED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-2 py-0.5 text-xs font-medium rounded-md shadow-2xs">
            {normalized}
          </Badge>
        );
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      className="inline-flex"
    >
      {renderBadge()}
    </motion.div>
  );
}
