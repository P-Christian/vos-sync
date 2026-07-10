// src/modules/client/company-profile/components/CompanyStatus.tsx
"use client";

import React from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerificationStatus } from "../types";

interface CompanyStatusProps {
  status: VerificationStatus;
  remarks?: string | null;
}

const STATUS_CONFIG: Record<
  VerificationStatus,
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
  PENDING: {
    icon: Clock,
    label: "In Review",
    badge: "bg-amber-500 text-white border-0",
    container:
      "border-amber-200/50 bg-amber-500/10 dark:bg-amber-950/20",
    iconWrapper:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    title: "Registration Status: PENDING VERIFICATION",
    titleClass: "text-amber-900 dark:text-amber-300",
    bodyClass: "text-amber-800/80 dark:text-amber-400/80",
    defaultMessage:
      "Your business account was submitted successfully. Verification officers are reviewing your organization. Job posting and hiring will unlock once verified.",
  },
  VERIFIED: {
    icon: CheckCircle2,
    label: "Verified",
    badge: "bg-emerald-600 text-white border-0",
    container:
      "border-emerald-200/50 bg-emerald-500/10 dark:bg-emerald-950/20",
    iconWrapper:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    title: "Verified Business Profile",
    titleClass: "text-emerald-900 dark:text-emerald-300",
    bodyClass: "text-emerald-800/80 dark:text-emerald-400/80",
    defaultMessage:
      "Your company registration is active. You can now post open roles, review matching job seekers, schedule interviews, and issue job offers.",
  },
  REJECTED: {
    icon: AlertCircle,
    label: "Rejected",
    badge: "bg-rose-600 text-white border-0",
    container: "border-rose-200/50 bg-rose-500/10 dark:bg-rose-950/20",
    iconWrapper:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    title: "Business Registration Rejected",
    titleClass: "text-rose-900 dark:text-rose-300",
    bodyClass: "text-rose-800/80 dark:text-rose-400/80",
    defaultMessage:
      "Your company verification could not be completed. Please contact support or resubmit with corrected documents.",
  },
  SUSPENDED: {
    icon: ShieldAlert,
    label: "Suspended",
    badge: "bg-zinc-600 text-white border-0",
    container: "border-zinc-200/50 bg-zinc-500/10 dark:bg-zinc-950/20",
    iconWrapper:
      "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
    title: "Account Temporarily Suspended",
    titleClass: "text-zinc-900 dark:text-zinc-300",
    bodyClass: "text-zinc-800/80 dark:text-zinc-400/80",
    defaultMessage:
      "Access to job posting has been restricted due to policy guidelines. Please coordinate with the governance team.",
  },
};

export default function CompanyStatus({ status, remarks }: CompanyStatusProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cfg.container}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl border shrink-0 ${cfg.iconWrapper}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className={`font-bold text-sm ${cfg.titleClass}`}>{cfg.title}</h3>
          <p className={`text-sm leading-relaxed max-w-2xl ${cfg.bodyClass}`}>
            {remarks || cfg.defaultMessage}
          </p>
        </div>
      </div>
      <Badge
        className={`w-fit shrink-0 py-1.5 px-3.5 text-xs font-semibold rounded-full shadow-sm ${cfg.badge}`}
      >
        {cfg.label}
      </Badge>
    </div>
  );
}

