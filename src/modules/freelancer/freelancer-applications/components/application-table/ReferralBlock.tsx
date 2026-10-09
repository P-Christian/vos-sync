// src/modules/freelancer/freelancer-applications/components/application-table/ReferralBlock.tsx
"use client";

import React from "react";

interface Props {
  schoolName?: string | null;
  referrerName?: string | null;
  referralLetter?: string | null;
}

export function ReferralBlock({ schoolName, referrerName, referralLetter }: Props) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">🎓</span>
        <div>
          <h4 className="font-bold text-sm text-purple-700 dark:text-purple-300">
            {schoolName ? `Endorsed by ${schoolName}` : "Official Academic Referral"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {referrerName
              ? `Submitted via ${referrerName}, School Administrator`
              : "Verified Academic Endorsement"}
          </p>
        </div>
      </div>

      {referralLetter && (
        <div className="rounded-lg border border-purple-200/70 dark:border-purple-900/50 bg-background/85 p-3 text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1 text-[11px] uppercase tracking-wider">
            Recommendation Letter Attached to Application
          </p>
          {referralLetter}
        </div>
      )}
    </div>
  );
}
