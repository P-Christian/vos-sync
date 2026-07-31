// src/modules/public/how-it-works/components/HeroSection.tsx
"use client";


import { Layers } from "lucide-react";

export function HeroSection() {

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b pt-14 pb-12 pt-22 px-4 sm:px-6 lg:px-8 text-center">
      {/* Glow background */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-3xl opacity-40 pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto space-y-4 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase shadow-2xs">
          <Layers className="h-3.5 w-3.5" />
          <span>VOS Sync Process Guide</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          How <span className="text-primary underline decoration-primary/30 underline-offset-8">VOS Sync</span> Works
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Choose your role below to explore the simple step-by-step roadmap for your account journey.
        </p>
      </div>
    </div>
  );
}
