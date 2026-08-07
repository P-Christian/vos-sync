// src/modules/vos-admin/role-matching/components/MatchTestStudio.tsx

"use client";

import React, { useState } from "react";
import { Play, Sparkles, Loader2, CheckCircle2, ShieldCheck, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMatchTester } from "../hooks/useMatchTester";

export function MatchTestStudio() {
  const [keywordInput, setKeywordInput] = useState("web developer");
  const { result, loading, error, runTest } = useMatchTester();

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    runTest(keywordInput);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950 via-zinc-900 to-violet-950 text-white border border-white/10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur border border-white/20 text-indigo-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Interactive Search &amp; Match Test Sandbox
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Match Test Studio</h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl">
            Test search terms and title synonyms in real-time against the VOS Sync Matching Engine Platform before publishing rule updates.
          </p>
        </div>
      </div>

      {/* Input Sandbox */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <form onSubmit={handleRun} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Search Query / Keyword</label>
            <Input
              placeholder="e.g. web developer, react dev, frontend engineer"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="h-10 text-sm font-medium"
            />
          </div>
          <div className="sm:self-end">
            <Button type="submit" disabled={loading} className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 border-0 shadow-md">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
              Run Test Simulation
            </Button>
          </div>
        </form>

        {error && <p className="text-xs text-rose-600 font-semibold mt-3">{error}</p>}
      </div>

      {/* Test Results Output */}
      {result && (
        <div className="space-y-6">
          {/* Resolved Intent Card */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 block mb-1">
                Resolved Role Taxonomy Intent
              </span>
              <h3 className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                {result.resolvedContext?.resolved_role ?? "Unresolved Raw Keyword"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Category: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{result.resolvedContext?.category_name ?? "General"}</span> · Matched Alias: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{result.resolvedContext?.matched_alias}</span> · Alias Weight: <span className="font-bold text-emerald-600">{Math.round((result.resolvedContext?.match_weight ?? 1) * 100)}%</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Compatibility Score</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{result.overallScore}% Match</span>
              </div>
              {result.confidence && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                  {result.confidence.level} Confidence
                </span>
              )}
            </div>
          </div>

          {/* Section Breakdown & Verified Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Breakdown Sections */}
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                Score Breakdown Sections
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {result.sections.map((sec, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[11px] font-medium text-zinc-400 block">{sec.label}</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{sec.score} / {sec.max} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence & Signals */}
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Verified Evidence Signals
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.evidence.map((ev, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Check className="h-3.5 w-3.5" />
                    {ev.label}: <span className="font-normal text-zinc-600 dark:text-zinc-400">{ev.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Trace Log */}
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Engine Execution Trace Log
              </h4>
              <span className="text-[11px] font-mono text-zinc-400">
                {result.trace.length} Execution Steps
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-300 space-y-2 max-h-80 overflow-y-auto shadow-inner">
              {result.trace.length === 0 ? (
                <p className="text-zinc-500 text-xs">No execution trace generated.</p>
              ) : (
                result.trace.map((tr, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-2 hover:bg-zinc-900/50 p-1.5 rounded-lg transition-colors">
                    <div className="space-y-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800/60 mr-2">
                        {tr.factor}
                      </span>
                      <span className="text-zinc-200">{tr.result}</span>
                    </div>
                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${tr.points > 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800" : "bg-zinc-800 text-zinc-400"}`}>
                      {tr.points > 0 ? `+${tr.points} pts` : `${tr.points} pts`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
