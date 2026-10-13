"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CompanyInfo } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, X, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ClientOnboardingCardProps {
  company: CompanyInfo;
  activeJobsCount: number;
}

const ONBOARDING_DISMISSED_KEY = "vos_client_onboarding_dismissed";

export function ClientOnboardingCard({ company, activeJobsCount }: ClientOnboardingCardProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
      if (dismissed !== "true") {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    } catch {
      // Ignore
    }
    setIsDismissed(true);
  };

  // Determine which steps are completed
  const hasProfile = Boolean(company.company_name && company.company_city);
  const hasJob = activeJobsCount > 0;
  // Steps 3 & 4 can be tracked or pending
  const steps = [
    {
      id: "profile",
      label: "Complete company profile",
      href: "/vos-sync/client/company-profile",
      isDone: hasProfile,
      hint: "Add bio, logo, and headquarters location",
    },
    {
      id: "job",
      label: "Post your first job",
      href: "/vos-sync/client/jobs",
      isDone: hasJob,
      hint: "Publish listings to attract top talent",
    },
    {
      id: "team",
      label: "Invite hiring team",
      href: "/vos-sync/client/settings?tab=team",
      isDone: false,
      hint: "Collaborate with recruiters and interviewers",
    },
    {
      id: "interview",
      label: "Schedule candidate interview",
      href: "/vos-sync/client/interviews",
      isDone: false,
      hint: "Set up video or onsite interview slots",
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <Card className="border border-[#E6EAF2] dark:border-[#1E2942] bg-white dark:bg-[#121A2E] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none overflow-hidden relative">
          <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between border-b border-[#E6EAF2]/60 dark:border-[#1E2942]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground dark:text-[#E6EAF5]">
                  Getting Started Checklist
                </CardTitle>
                <p className="text-xs text-muted-foreground dark:text-[#8A94AD]">
                  Complete these steps to unlock full automated hiring capabilities.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-primary px-2.5 py-1 bg-primary/10 rounded-full">
                {completedCount} of {steps.length} done
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Dismiss checklist"
                aria-label="Dismiss checklist"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 pt-3 space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-muted/60 dark:bg-[#0E1426] h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist items in responsive 2x2 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {steps.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all group"
                >
                  <div className="flex items-start gap-2.5">
                    {step.isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
                    )}
                    <div>
                      <span
                        className={`text-xs font-semibold block transition-colors ${
                          step.isDone
                            ? "text-muted-foreground line-through"
                            : "text-foreground group-hover:text-primary"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground/80 block mt-0.5">
                        {step.hint}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-0.5" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
