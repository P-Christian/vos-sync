// src/modules/public/how-it-works/components/StepCard.tsx
"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { StepItem, RoleKey } from "../types";
import { StepIllustration } from "./StepIllustration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  step: StepItem;
  roleKey: RoleKey;
  isEven: boolean;
}

export function StepCard({ step, roleKey, isEven }: Props) {
  const isIllustrationLeft = !isEven; // Odd steps: illustration left, even steps: content left

  return (
    <div id={`step${step.stepNumber}`} className="py-12 border-b last:border-b-0 scroll-mt-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Illustration Column */}
        <div className={`lg:col-span-6 ${isIllustrationLeft ? "lg:order-1" : "lg:order-2"}`}>
          <StepIllustration
            src={step.illustrationSrc}
            alt={step.illustrationAlt}
            roleKey={roleKey}
            stepNumber={step.stepNumber}
          />
        </div>

        {/* Content Column */}
        <div className={`lg:col-span-6 space-y-5 ${isIllustrationLeft ? "lg:order-2" : "lg:order-1"}`}>
          {/* Header Row: Step Number + Status Chip + Time */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              STEP 0{step.stepNumber}
            </span>

            <Badge variant="outline" className="text-xs font-semibold uppercase">
              {step.statusChip}
            </Badge>

            <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-md border">
              {step.estimatedTime}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {step.title}
          </h3>

          {/* Explanation Paragraph */}
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Success Outcome Callout Box ("Why am I doing this?") */}
          <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Expected Outcome / Why This Step Matters
            </span>
            <p className="text-xs font-semibold text-foreground leading-relaxed">
              {step.outcome}
            </p>
          </div>

          {/* Requirements Checklist */}
          {step.requirements && step.requirements.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Key Requirements & Reminders:
              </span>
              <ul className="space-y-1.5 text-xs text-foreground font-medium">
                {step.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Button */}
          {step.actionLabel && step.actionRoute && (
            <div className="pt-2">
              <Button asChild size="sm" className="font-bold text-xs gap-2 shadow-sm">
                <Link href={step.actionRoute}>
                  {step.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
