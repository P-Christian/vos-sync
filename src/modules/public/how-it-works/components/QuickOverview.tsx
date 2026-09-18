// src/modules/public/how-it-works/components/QuickOverview.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { User, Building2, GraduationCap, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { RoleKey } from "../types";
import { ROLE_GUIDES } from "../config";

interface Props {
  activeRole: RoleKey;
  onSelectRole: (role: RoleKey) => void;
}

export function QuickOverview({ activeRole, onSelectRole }: Props) {
  const cards = [
    {
      key: "employee" as RoleKey,
      title: "Employee / Job Seeker",
      icon: <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      colorClass: "hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20",
      activeClass: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-md",
      guide: ROLE_GUIDES.employee,
    },
    {
      key: "employer" as RoleKey,
      title: "Employer / Company",
      icon: <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      colorClass: "hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20",
      activeClass: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md",
      guide: ROLE_GUIDES.employer,
    },
    {
      key: "school" as RoleKey,
      title: "School / Institution",
      icon: <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      colorClass: "hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
      activeClass: "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md",
      guide: ROLE_GUIDES.school,
    },
  ];

  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollBySlide = (direction: number) => {
    const el = trackRef.current;
    const slide = el?.children[0] as HTMLElement | undefined;
    if (!el || !slide) return;
    const step =
      slide.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const handleTrackScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = trackRef.current;
      const slide = el?.children[0] as HTMLElement | undefined;
      if (!el || !slide) return;
      const step =
        slide.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0);
      const idx = Math.min(cards.length - 1, Math.max(0, Math.round(el.scrollLeft / step)));
      const next = cards[idx];
      if (next && next.key !== activeRole) onSelectRole(next.key);
    }, 60);
  };

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = [...el.children] as HTMLElement[];
    const idx = slides.findIndex((s) => s.getAttribute("aria-pressed") === "true");
    const slide = slides[idx];
    if (idx < 0 || !slide) return;
    const step =
      slide.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0);
    el.scrollLeft = idx * step - (el.clientWidth - slide.getBoundingClientRect().width) / 2;
  }, [activeRole]);

  return (
    <div id="quick-overview-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Quick Overview & Role Summary
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-md:hidden">
        {cards.map((card) => {
          const isActive = activeRole === card.key;
          return (
            <div
              key={card.key}
              onClick={() => onSelectRole(card.key)}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-3 relative overflow-hidden bg-card ${
                isActive ? card.activeClass : card.colorClass
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl border bg-background shrink-0 shadow-2xs">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{card.title}</h3>
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {card.guide.totalOnboardingTime}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.guide.oneSentenceSummary}
              </p>

              <div className="pt-1 flex items-center justify-end">
                <span className={`text-xs font-bold flex items-center gap-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {isActive ? "Viewing Roadmap" : "View Roadmap"}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile role picker */}
      <div className="md:hidden">
        <div
          ref={trackRef}
          onScroll={handleTrackScroll}
          role="group"
          aria-label="Choose a role"
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain scrollbar-none pb-2 -mx-4 px-4"
        >
          {cards.map((card) => {
            const isActive = activeRole === card.key;
            return (
              <div
                key={card.key}
                onClick={() => onSelectRole(card.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectRole(card.key);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                className={`snap-center snap-always shrink-0 w-[85%] rounded-2xl border p-5 space-y-3 bg-card cursor-pointer transition-all duration-200 ${
                  isActive ? card.activeClass : card.colorClass
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border bg-background shrink-0 shadow-2xs">
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{card.title}</h3>
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {card.guide.totalOnboardingTime}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.guide.oneSentenceSummary}
                </p>

                <div className="pt-1 flex items-center justify-end">
                  <span className={`text-xs font-bold flex items-center gap-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {isActive ? "Viewing Roadmap" : "View Roadmap"}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            type="button"
            aria-label="Previous role"
            onClick={() => scrollBySlide(-1)}
            disabled={activeRole === cards[0].key}
            className="h-11 w-11 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {cards.map((card) => (
              <span
                key={card.key}
                className={`h-1.5 rounded-full transition-all ${
                  activeRole === card.key ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next role"
            onClick={() => scrollBySlide(1)}
            disabled={activeRole === cards[cards.length - 1].key}
            className="h-11 w-11 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
