"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AIPromotionCard: React.FC = () => {
  return (
    <div className="bg-primary rounded-xl p-8 text-primary-foreground h-full flex flex-col justify-center relative overflow-hidden shadow-sm">
      {/* Decorative glow circle */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 bg-white blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        <Sparkles className="w-8 h-8 text-white/90" />
        <div>
          <h3 className="text-lg font-bold mb-2">AI Profile Tune-up</h3>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">
            Our AI analyzed your recent applications. Updating your case study for "Velocity SaaS" could boost your offer chance.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full bg-background text-primary font-bold border-transparent hover:bg-background/90 hover:text-primary"
        >
          Run Analysis
        </Button>
      </div>
    </div>
  );
};
