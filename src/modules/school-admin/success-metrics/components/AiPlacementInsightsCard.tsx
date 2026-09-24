// src/modules/school-admin/success-metrics/components/AiPlacementInsightsCard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSuccessMetricsContext } from '../providers/SuccessMetricsProvider';
import { Sparkles, Loader2, CheckCircle2, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';

export function AiPlacementInsightsCard() {
  const { data, insight, isGeneratingAi, aiError, generateAiInsights } = useSuccessMetricsContext();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                AI Placement & Employability Insights
              </CardTitle>
              <CardDescription className="text-xs">
                Stateless AI analysis synthesized from current cohort placement and application numbers
              </CardDescription>
            </div>
          </div>

          <Button
            onClick={generateAiInsights}
            disabled={isGeneratingAi || !data}
            size="sm"
            className="gap-2 shrink-0"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Metrics...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {insight ? 'Regenerate Analysis' : 'Generate AI Insights'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {aiError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {!insight && !isGeneratingAi && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <Sparkles className="mb-2 h-7 w-7 opacity-30 text-primary" />
            <p className="text-sm font-medium text-foreground">No AI analysis generated yet</p>
            <p className="mt-1 text-xs max-w-md">
              Click &quot;Generate AI Insights&quot; above to produce an executive briefing, curriculum strengths, and placement recommendations.
            </p>
          </div>
        )}

        {isGeneratingAi && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Gemini AI is analyzing cohort statistics...</p>
            <p className="mt-1 text-xs text-muted-foreground">Synthesizing placement rates and industry trends</p>
          </div>
        )}

        {insight && !isGeneratingAi && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            {/* Executive Summary */}
            <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Executive Summary</h4>
              <p className="mt-1.5 text-sm text-foreground leading-relaxed">{insight.executiveSummary}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Key Strengths */}
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Key Strengths
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {insight.keyStrengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Growth Opportunities */}
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  Areas to Optimize
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {insight.growthOpportunities.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actionable Recommendations */}
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  Dean & Admin Advice
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {insight.actionableRecommendations.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-1 text-[11px] text-muted-foreground">
              Generated: {new Date(insight.generatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
