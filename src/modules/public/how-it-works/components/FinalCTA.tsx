// src/modules/public/how-it-works/components/FinalCTA.tsx
"use client";


import Link from "next/link";
import { ArrowRight} from "lucide-react";
import { RoleGuide } from "../types";
import { Button } from "@/components/ui/button";

interface Props {
  guide: RoleGuide;
}

export function FinalCTA({ guide }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-3xl p-8 sm:p-14 text-center text-white relative overflow-hidden border border-slate-700/50 shadow-2xl space-y-6">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase tracking-wide">
         
          <span>Ready to Start?</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          {guide.finalCtaTitle}
        </h2>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {guide.finalCtaSubtitle}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <Button asChild size="lg" className="rounded-full px-8 py-6 text-sm font-bold gap-2 shadow-lg bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900">
            <Link href={guide.finalCtaRoute}>
              {guide.finalCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 text-sm font-bold border-slate-600 text-white bg-transparent hover:bg-white/10 hover:text-white">
            <Link href="/find-jobs">
              Browse Open Opportunities
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
