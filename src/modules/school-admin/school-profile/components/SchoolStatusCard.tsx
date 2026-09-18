// src/modules/school-admin/school-profile/components/SchoolStatusCard.tsx
"use client";

import React from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerificationStatus } from "@/modules/school-admin/types/school-admin.types";
import { motion, AnimatePresence } from "framer-motion";

interface SchoolStatusCardProps {
  status: VerificationStatus | string;
  remarks?: string | null;
}

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    badge: string;
    container: string;
    iconWrapper: string;
    title: string;
    titleClass: string;
    bodyClass: string;
    defaultMessage: string;
  }
> = {
  DRAFT: {
    icon: Clock,
    label: "Draft",
    badge: "bg-muted text-muted-foreground border-border",
    container: "border-border bg-muted/30",
    iconWrapper: "bg-muted text-muted-foreground border-border",
    title: "Registration Status: DRAFT",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your institutional profile is currently in draft mode. Complete profile details and academic programs to publish your campus identity.",
  },
  PENDING_VERIFICATION: {
    icon: Clock,
    label: "In Review",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    container: "border-amber-500/20 bg-amber-500/5",
    iconWrapper: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    title: "Registration Status: PENDING VERIFICATION",
    titleClass: "text-amber-700 dark:text-amber-300",
    bodyClass: "text-amber-800/80 dark:text-amber-400/80",
    defaultMessage: "Your educational institution profile is under review by VOS platform administrators.",
  },
  VERIFIED: {
    icon: CheckCircle2,
    label: "Verified",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    container: "border-emerald-500/20 bg-emerald-500/5",
    iconWrapper: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    title: "Verified Educational Institution",
    titleClass: "text-emerald-700 dark:text-emerald-300",
    bodyClass: "text-emerald-800/80 dark:text-emerald-400/80",
    defaultMessage: "Your school registration is active. Student roster syncing, academic partnerships, and employer integrations are fully unlocked.",
  },
  REJECTED: {
    icon: AlertCircle,
    label: "Rejected",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    container: "border-rose-500/20 bg-rose-500/5",
    iconWrapper: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    title: "Registration Needs Revision",
    titleClass: "text-rose-700 dark:text-rose-300",
    bodyClass: "text-rose-800/80 dark:text-rose-400/80",
    defaultMessage: "Institution verification could not be completed. Please check reviewer feedback and resubmit.",
  },
  INACTIVE: {
    icon: AlertCircle,
    label: "Inactive",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    container: "border-zinc-500/20 bg-zinc-500/5",
    iconWrapper: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    title: "Registration Status: INACTIVE",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your school profile is currently inactive. Public visibility and student portals are paused.",
  },
  SUSPENDED: {
    icon: ShieldAlert,
    label: "Suspended",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    container: "border-rose-500/20 bg-rose-500/5",
    iconWrapper: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    title: "Account Suspended",
    titleClass: "text-rose-700 dark:text-rose-300",
    bodyClass: "text-rose-800/80 dark:text-rose-400/80",
    defaultMessage: "Access to institutional management is restricted. Please coordinate with VOS administration.",
  },
};

export default function SchoolStatusCard({ status, remarks }: SchoolStatusCardProps) {
  const normStatus = (status || "DRAFT").toUpperCase();
  const cfg = STATUS_CONFIG[normStatus] ?? STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cfg.container}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border shrink-0 ${cfg.iconWrapper}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h4 className={`font-bold text-xs uppercase tracking-wider ${cfg.titleClass}`}>
              {cfg.title}
            </h4>
            <p className={`text-xs leading-relaxed ${cfg.bodyClass}`}>
              {cfg.defaultMessage}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`w-fit shrink-0 py-0.5 px-2 text-[10px] font-bold rounded-full ${cfg.badge}`}>
          {cfg.label}
        </Badge>
      </div>

      <AnimatePresence>
        {remarks && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3 rounded-lg border bg-card text-card-foreground space-y-1 shadow-xs"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              Reviewer Notes
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
              {remarks}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
