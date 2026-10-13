"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  ArrowRight,
  Zap,
  Layers,
  Globe,
  Sliders,
  CheckCircle2,
  MousePointer,
} from "lucide-react";
import {
  AuroraBackground as Aurora1,
  type MouseEffect,
} from "@/app/(public)/test-background/aurora-background";
import { ConstellationBackground as Aurora2 } from "@/app/(public)/test-background/aurora-background2";
import { VividBackground as Aurora3 } from "@/app/(public)/test-background/aurora-background3";
import { RidgelineBackground as Aurora4 } from "@/app/(public)/test-background/aurora-background4";
import { AuroraBackground as Aurora5 } from "@/app/(public)/test-background/aurora-background5";
import { CalmBackground as Aurora6 } from "@/app/(public)/test-background/aurora-background6";
import { NetworkBackground as Aurora7 } from "@/app/(public)/test-background/aurora-background7";
import { VividPopBackground as Aurora8 } from "@/app/(public)/test-background/aurora-background8";

import { AuroraBackground as Aurora9 } from "@/app/(public)/test-background/aurora-background9";
import {
  type BackgroundVariant,
  BlueBackground as Aurora10,
} from "@/app/(public)/test-background/aurora-background10";
import { useAtsBackground as Aurora11 } from "@/app/(public)/test-background/aurora-background11";
import { TalentFlowBackground as Aurora12 } from "@/app/(public)/test-background/aurora-background12";
import { HiringHubBackground as Aurora13 } from "@/app/(public)/test-background/aurora-background13";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VARIANTS: BackgroundVariant[] = [
  "aurora",
  "waves",
  "bubbles",
  "constellation",
  "mesh",
];

const ALL_MOUSE_EFFECTS: MouseEffect[] = [
  "shapes",
  "trail",
  "particles",
  "ripple",
  "glow",
];

const PRESET_OPTIONS: { label: string; effects: MouseEffect[] }[] = [
  { label: "Default (trail + shapes)", effects: ["trail", "shapes"] },
  { label: "Particles + Ripple", effects: ["particles", "ripple"] },
  { label: "All (shapes, trail, particles, ripple)", effects: ["shapes", "trail", "particles", "ripple"] },
  { label: "Off / None", effects: [] },
];

export default function TestAuroraPage() {
  const [design, setDesign] = useState<number>(10);
  const [variant, setVariant] = useState<BackgroundVariant>("waves");
  const [mouseEffects, setMouseEffects] = useState<MouseEffect[]>(["trail", "shapes"]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const toggleEffect = (effect: MouseEffect) => {
    setMouseEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
  };

  const isPresetActive = (effects: MouseEffect[]) => {
    if (effects.length !== mouseEffects.length) return false;
    return effects.every((e) => mouseEffects.includes(e));
  };

  return (
    <div className="relative isolate min-h-[calc(100dvh-6rem)] overflow-hidden font-sans [&_.ab-root]:z-0 [&_.bb-root]:z-0">
      {/* Dynamic Aurora Background Switcher */}
      {design === 1 && <Aurora1 mouse={mouseEffects} />}
      {design === 2 && <Aurora2 />}
      {design === 3 && <Aurora3 ripple={mouseEffects.includes("ripple")} />}
      {design === 4 && <Aurora4 />}
      {design === 5 && <Aurora5 />}
      {design === 6 && <Aurora6 interactive={mouseEffects.length > 0} />}
      {design === 7 && <Aurora7 />}
      {design === 8 && <Aurora8 ripple={mouseEffects.includes("ripple")} />}
      {design === 9 && <Aurora9 />}
      {design === 10 && <Aurora10 variant={variant} interactive={mouseEffects.length > 0} />}
      {design === 11 && <Aurora11 />}
      {design === 12 && <Aurora12 />}
      {design === 13 && <Aurora13 />}

      {/* Floating Controls Toolbar */}
      <div className="sticky top-2 z-50 flex flex-col items-center gap-2 py-2 px-4 pointer-events-auto">
        {/* 1 - 10 Design Picker */}
        <div className="inline-flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl bg-white/70 dark:bg-card/80 backdrop-blur-xl border border-white/60 dark:border-border/60 shadow-[0_8px_32px_rgba(37,99,235,0.15)]">
          <span className="text-[11px] sm:text-xs font-bold px-2 sm:px-3 text-muted-foreground uppercase tracking-wider">
            Design
          </span>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setDesign(num)}
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                design === num
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "text-foreground/75 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              title={`Switch to Aurora Background Design ${num}`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Design 10 Sub-Variant Picker */}
        {design === 10 && (
          <div className="inline-flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl bg-white/70 dark:bg-card/80 backdrop-blur-xl border border-white/60 dark:border-border/60 shadow-[0_8px_24px_rgba(37,99,235,0.12)]">
            <span className="text-[11px] sm:text-xs font-bold px-2 text-muted-foreground uppercase tracking-wider">
              Variant:
            </span>
            {VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                  variant === v
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-muted/50 text-foreground/80 hover:bg-muted"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* Mouse Interaction Switch Toolbar */}
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-white/70 dark:bg-card/80 backdrop-blur-xl border border-white/60 dark:border-border/60 shadow-[0_8px_24px_rgba(37,99,235,0.12)] max-w-4xl">
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 text-muted-foreground uppercase tracking-wider">
            <MousePointer className="w-3.5 h-3.5 text-blue-500" />
            <span>Mouse:</span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1">
            {PRESET_OPTIONS.map((preset, idx) => {
              const active = isPresetActive(preset.effects);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMouseEffects(preset.effects)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-muted/50 text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <span className="hidden sm:inline-block w-px h-4 bg-border/80 mx-1" />

          {/* Individual Toggle Chips */}
          <div className="flex flex-wrap items-center gap-1">
            {ALL_MOUSE_EFFECTS.map((eff) => {
              const active = mouseEffects.includes(eff);
              return (
                <button
                  key={eff}
                  type="button"
                  onClick={() => toggleEffect(eff)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all duration-150 cursor-pointer border ${
                    active
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold"
                      : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {active ? "✓ " : "+ "}{eff}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Showcase Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pt-8 md:pb-32">
        {/* Top Header Badge */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 backdrop-blur-md text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            <span>
              Design #{design} {design === 10 ? `(${variant})` : ""} | Active Mouse Effects:{" "}
              {mouseEffects.length > 0 ? `[${mouseEffects.join(", ")}]` : "None"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Atmospheric <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400">Aurora Flow</span> & Glassmorphism
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Move your cursor around to test the selected mouse effects across the backdrop.
          </p>

          {/* Frosted Glass Search Bar */}
          <div className="max-w-3xl mx-auto mt-8 rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-card/40 p-2.5 shadow-[0_8px_32px_rgba(37,99,235,0.12)] backdrop-blur-xl backdrop-saturate-150 flex flex-col sm:flex-row gap-2 transition-all hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)]">
            <div className="flex-1 flex items-center px-3 py-1.5">
              <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <Input
                type="text"
                placeholder={`Test typing over Aurora Design ${design}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 px-0 text-base h-auto py-1 bg-transparent placeholder:text-muted-foreground/70"
              />
            </div>
            <Button size="lg" className="rounded-xl px-7 text-base shadow-md cursor-pointer">
              Test Action
            </Button>
          </div>
        </div>

        {/* Feature Cards Grid (Transparent Glass Cards to Test Pass-Through) */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-card/40 p-6 md:p-8 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(37,99,235,0.16)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">60 FPS GPU Composite</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              All wave undulations run exclusively on the GPU compositor using pure CSS <code className="text-xs bg-muted/60 px-1 py-0.5 rounded">transform: translate3d</code> keyframes without triggering layout recalculations.
            </p>
            <div className="mt-auto pt-4 border-t border-border/40 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Zero CPU Paint Thrashing
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-card/40 p-6 md:p-8 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(37,99,235,0.16)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Zero Re-Render Mouse Loop</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Mouse tracking utilizes a single self-throttling <code className="text-xs bg-muted/60 px-1 py-0.5 rounded">requestAnimationFrame</code> loop that writes coordinates straight to DOM refs, preventing React component re-renders.
            </p>
            <div className="mt-auto pt-4 border-t border-border/40 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Stops Automatically When Idle
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-card/40 p-6 md:p-8 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(37,99,235,0.16)] flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-5">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Parallax Floating Geometry</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Floating rings and pseudo-3D orbs shift in opposing depth layers relative to your cursor position, providing organic visual depth while preserving non-blocking pointer events.
            </p>
            <div className="mt-auto pt-4 border-t border-border/40 flex items-center text-xs font-semibold text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Multi-Layered Depth Perception
            </div>
          </div>
        </div>

        {/* Interactive Controls & Navigation */}
        <div className="mt-14 max-w-xl mx-auto rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-card/40 p-6 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150 text-center">
          <h4 className="text-base font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" /> Interactive Mode Options
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Verify click-through pass-through functionality on buttons and navigation links.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={activeTab === "overview" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("overview")}
              className="rounded-full cursor-pointer"
            >
              Overview Mode
            </Button>
            <Button
              variant={activeTab === "stress" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("stress")}
              className="rounded-full cursor-pointer"
            >
              Motion Test Mode
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-full">
              <Link href="/">
                Return to Home <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
