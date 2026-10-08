// src/modules/freelancer/freelancer-applications/components/application-table/ApplicationProgressTimeline.tsx
"use client";

import React from "react";
import { Calendar, CheckCircle, Clock, Star, XCircle } from "lucide-react";
import type { ApplicationStatus } from "../../types";

interface Props {
  status: ApplicationStatus;
}

export function ApplicationProgressTimeline({ status }: Props) {
  return (
    <div className="border border-border bg-muted/20 p-5 rounded-xl space-y-4">
      <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-bold">
        Application Progress
      </p>

      <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
        {status === "REJECTED" ? (
          <>
            <div className="relative flex gap-4 items-start">
              <span className="absolute -left-[29px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-background">
                <CheckCircle className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Applied</p>
                <p className="text-sm md:text-xs text-muted-foreground mt-0.5">
                  Your application was successfully submitted.
                </p>
              </div>
            </div>

            <div className="relative flex gap-4 items-start">
              <span className="absolute -left-[29px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-rose-500 text-white ring-4 ring-background">
                <XCircle className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Rejected</p>
                <p className="text-sm md:text-xs text-muted-foreground mt-0.5">
                  The employer decided not to move forward with your application.
                </p>
              </div>
            </div>
          </>
        ) : (
          (() => {
            const statusOrder = ["APPLIED", "SHORTLISTED", "INTERVIEWING", "HIRED"];
            const currentIndex = statusOrder.indexOf(status);

            const steps = [
              { label: "Applied", desc: "Your application was successfully submitted." },
              {
                label: "Shortlisted",
                desc: "The employer has shortlisted you for potential opportunities.",
              },
              {
                label: "Interviewing",
                desc: "You have entered the interview phase with the employer.",
              },
              {
                label: "Hired",
                desc: "Congratulations! You have been hired for this role.",
              },
            ];

            return steps.map((step, idx) => {
              const isCompleted = idx < currentIndex || status === "HIRED";
              const isActive = idx === currentIndex && status !== "HIRED";

              let iconBg = "bg-muted text-muted-foreground";
              let labelColor = "text-muted-foreground";
              let Icon = Clock;

              if (isCompleted) {
                iconBg = "bg-emerald-500 text-white";
                labelColor = "text-foreground font-medium";
                Icon = CheckCircle;
              } else if (isActive) {
                iconBg = "bg-primary text-primary-foreground ring-4 ring-primary/20";
                labelColor = "text-primary font-semibold";
                if (idx === 1) Icon = Star;
                else if (idx === 2) Icon = Calendar;
                else Icon = Clock;
              } else {
                if (idx === 1) Icon = Star;
                else if (idx === 2) Icon = Calendar;
                else if (idx === 3) Icon = CheckCircle;
              }

              return (
                <div key={idx} className="relative flex gap-4 items-start">
                  <span
                    className={`absolute -left-[29px] flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-4 ring-background ${iconBg}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className={`text-sm ${labelColor}`}>{step.label}</p>
                    <p className="text-sm md:text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
}
