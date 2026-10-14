// src/modules/client/company-profile/components/CompanyStatus.tsx
"use client";

import React from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerificationStatus } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface CompanyStatusProps {
  status: VerificationStatus;
  remarks?: string | null;
  publicRejectionReason?: string | null;
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
  DRAFT: {
    icon: Clock,
    label: "Draft",
    badge: "bg-muted text-muted-foreground border-border",
    container: "border-border/70 bg-card/70 backdrop-blur-md",
    iconWrapper: "bg-muted text-muted-foreground border-border",
    title: "Registration Status: DRAFT",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your company profile is in draft mode. Click edit to complete your profile details and submit for verification.",
  },
  PENDING_VERIFICATION: {
    icon: Clock,
    label: "In Review",
    badge: "bg-warning/15 text-warning border-warning/30",
    container: "border-warning/25 bg-warning/[0.06] backdrop-blur-md",
    iconWrapper: "bg-warning/15 text-warning border-warning/30",
    title: "Registration Status: PENDING VERIFICATION",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your business account was submitted successfully. Verification officers are reviewing your organization. Job posting and hiring will unlock once verified.",
  },
  VERIFIED: {
    icon: CheckCircle2,
    label: "Verified",
    badge: "bg-success/15 text-success border-success/30",
    container: "border-success/25 bg-success/[0.06] backdrop-blur-md",
    iconWrapper: "bg-success/15 text-success border-success/30",
    title: "Verified Business Profile",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your company registration is active. You can now post open roles, review matching job seekers, schedule interviews, and issue job offers.",
  },
  REJECTED: {
    icon: AlertCircle,
    label: "Rejected",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    container: "border-destructive/25 bg-destructive/[0.06] backdrop-blur-md",
    iconWrapper: "bg-destructive/15 text-destructive border-destructive/30",
    title: "Business Registration Rejected",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your company verification could not be completed. Please review the reviewer feedback below and resubmit with updated documents.",
  },
  INACTIVE: {
    icon: AlertCircle,
    label: "Inactive",
    badge: "bg-muted text-muted-foreground border-border",
    container: "border-border/70 bg-card/70 backdrop-blur-md",
    iconWrapper: "bg-muted text-muted-foreground border-border",
    title: "Registration Status: INACTIVE",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Your company profile is currently inactive. Public visibility and job postings are disabled.",
  },
  SUSPENDED: {
    icon: ShieldAlert,
    label: "Suspended",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    container: "border-destructive/25 bg-destructive/[0.06] backdrop-blur-md",
    iconWrapper: "bg-destructive/15 text-destructive border-destructive/30",
    title: "Account Temporarily Suspended",
    titleClass: "text-foreground",
    bodyClass: "text-muted-foreground",
    defaultMessage: "Access to job posting has been restricted due to policy guidelines. Please coordinate with the governance team.",
  },
};

export default function CompanyStatus({ status, remarks, publicRejectionReason }: CompanyStatusProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_VERIFICATION;
  const Icon = cfg.icon;
  const feedback = publicRejectionReason || remarks;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border p-5 space-y-3 ${cfg.container}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border shrink-0 ${cfg.iconWrapper}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className={`font-bold text-sm ${cfg.titleClass}`}>{cfg.title}</h3>
        </div>
        <Badge className={`w-fit shrink-0 py-1 px-3 text-xs font-semibold rounded-full shadow-2xs border ${cfg.badge}`}>
          {cfg.label}
        </Badge>
      </div>

      <p className={`text-xs leading-relaxed ${cfg.bodyClass}`}>
        {cfg.defaultMessage}
      </p>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-2 p-4 rounded-xl border bg-background/80 dark:bg-background/40 backdrop-blur-xs space-y-1.5 shadow-2xs overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
              Verification Reviewer Feedback / Action Items
            </div>
            <p className="text-sm md:text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
              {feedback}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

