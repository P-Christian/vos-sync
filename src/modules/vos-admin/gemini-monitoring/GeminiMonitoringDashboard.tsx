"use client";

// src/modules/vos-admin/gemini-monitoring/GeminiMonitoringDashboard.tsx

import { useEffect, useState, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Radio,

  Layers,
  TrendingDown,

  Blocks,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

interface GeminiKPIs {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  successCount: number;
  failedCount: number;
  timeoutCount: number;
  rateLimitCount: number;
  successRate: number;
  lastSuccessAt: string | null;
  recentSuccessRate: number;
  recentAvgLatencyMs: number;
}

interface GeminiFeatureStat {
  feature: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  successCount: number;
  failedCount: number;
}

interface GeminiErrorStat {
  status400: number;
  status403: number;
  status429: number;
  status500: number;
  status503: number;
  timeouts: number;
}

interface GeminiFreeTierStatus {
  model: string;
  dailyFreeInputTokens: number;
  dailyFreeOutputTokens: number;
  todayPromptTokens: number;
  todayCompletionTokens: number;
  billableInputTokens: number;
  billableOutputTokens: number;
  estimatedCostUsd: number;
  freeTierActive: boolean;
}

interface AuditLogEntry {
  id: string;
  requestId: string;
  feature: string;
  provider: string;
  model: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string | null;
  responseStatus: string;
  latencyMs: number;
  httpStatus: number;
  errorMessage: string | null;
  userId: number | null;
  companyId: number | null;
  userName: string | null;
  companyName: string | null;
  createdAt: string;
}

interface GeminiRateLimitStatus {
  model: string;
  rpmCurrent: number;
  rpmLimit: number;
  rpmPercent: number;
  tpmCurrent: number;
  tpmLimit: number;
  tpmPercent: number;
  rpdCurrent: number;
  rpdLimit: number;
  rpdPercent: number;
}

interface TelemetryData {
  success: boolean;
  configuredModel: string;
  apiKeyConfigured: boolean;
  serviceHealth: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "NO_DATA";
  lastSuccessAt: string | null;
  recentSuccessRate: number;
  recentAvgLatencyMs: number;
  kpis: GeminiKPIs;
  freeTierStatus: GeminiFreeTierStatus;
  rateLimitStatus?: GeminiRateLimitStatus;
  featureBreakdown: GeminiFeatureStat[];
  errorBreakdown: GeminiErrorStat;
  auditLog: AuditLogEntry[];
  lastCheckedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function featureLabel(feature: string): string {
  const map: Record<string, string> = {
    AI_RERANKER: "AI Reranker",
    MATCH_EXPLAINER: "Match Explainer",
    QUERY_UNDERSTANDING: "Query Understanding",
    BEST_MATCH: "Best Match AI",
  };
  return map[feature] ?? feature;
}

function timeSince(isoString: string | null): string {
  if (!isoString) return "No recent requests";
  const ms = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const HealthBadge = memo(({ health }: { health: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "NO_DATA" }) => {
  if (health === "HEALTHY") {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 gap-1.5 px-3 py-1 font-bold">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Healthy
      </Badge>
    );
  }
  if (health === "DEGRADED") {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800 gap-1.5 px-3 py-1 font-bold">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Degraded
      </Badge>
    );
  }
  if (health === "NO_DATA") {
    return (
      <Badge variant="outline" className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 gap-1.5 px-3 py-1 font-bold">
        <Clock className="h-3.5 w-3.5 text-zinc-400" /> No Data Yet
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800 gap-1.5 px-3 py-1 font-bold">
      <XCircle className="h-3.5 w-3.5 text-rose-500" /> Unavailable
    </Badge>
  );
});
HealthBadge.displayName = "HealthBadge";

const ResponseStatusBadge = memo(({ status }: { status: string }) => {
  if (status === "SUCCESS") {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-0 text-[10px] font-bold">SUCCESS</Badge>;
  }
  if (status === "TIMEOUT") {
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0 text-[10px] font-bold">TIMEOUT</Badge>;
  }
  return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-0 text-[10px] font-bold">ERROR</Badge>;
});
ResponseStatusBadge.displayName = "ResponseStatusBadge";

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function GeminiMonitoringDashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTelemetry = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch("/api/vos-admin/gemini-monitoring", { cache: "no-store" });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json: TelemetryData = await res.json();
      setData(json);
    } catch (err) {
      setFetchError((err as Error)?.message || "Failed to load telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchTelemetry();
    });
    const interval = setInterval(() => fetchTelemetry(true), 30000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-sm">Loading Gemini telemetry…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-zinc-900 to-indigo-950 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <Cpu className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">Gemini AI Monitoring</h1>
              <code className="text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-md text-zinc-300">
                {data?.configuredModel ?? "—"}
              </code>
              {data && <HealthBadge health={data.serviceHealth} />}
            </div>
            <p className="text-sm text-zinc-300 mt-1">
              Observability, audit, and cost tracking for every Gemini API invocation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <Button
            onClick={() => fetchTelemetry(true)}
            disabled={refreshing}
            variant="outline"
            className="h-10 text-xs px-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{fetchError}</span>
        </div>
      )}
      
      {/* ── Setup Notice ─────── */}
      {data?.serviceHealth === "NO_DATA" && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900 rounded-xl text-blue-700 dark:text-blue-300 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Cpu className="h-4 w-4 text-blue-500" />
            Waiting for Telemetry Data
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Live telemetry will appear here automatically. Trigger a Talent Search to make your first Gemini request and populate this view.
          </p>
        </div>
      )}

      {/* ── Service Health ────────────────────────────────────────────────── */}
      {data && (
        <Card className="shadow-sm border bg-card rounded-2xl p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Radio className={`h-4 w-4 ${data.serviceHealth === "HEALTHY" ? "text-emerald-500 animate-pulse" : "text-amber-500"}`} />
            <span className="text-sm font-bold">Service Health</span>
            <HealthBadge health={data.serviceHealth} />
            <span className="text-xs text-muted-foreground ml-2">
              Last successful request: <strong>{timeSince(data.lastSuccessAt)}</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              · Success rate (last 5 min): <strong className="text-foreground">{data.recentSuccessRate}%</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              · Avg latency (last 5 min): <strong className="text-foreground">{data.recentAvgLatencyMs} ms</strong>
            </span>
          </div>
        </Card>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Requests (Today)", value: data?.kpis.totalRequests ?? 0, icon: <Activity className="h-4 w-4 text-indigo-500" />, unit: "" },
          { label: "Input Tokens", value: formatTokens(data?.kpis.totalPromptTokens ?? 0), icon: <Zap className="h-4 w-4 text-amber-500" />, unit: "" },
          { label: "Output Tokens", value: formatTokens(data?.kpis.totalCompletionTokens ?? 0), icon: <Blocks className="h-4 w-4 text-violet-500" />, unit: "" },
          { label: "Avg Latency", value: `${data?.kpis.avgLatencyMs ?? 0}`, icon: <Clock className="h-4 w-4 text-blue-500" />, unit: "ms" },
          { label: "Success Rate", value: `${data?.kpis.successRate ?? 100}`, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, unit: "%" },
          { label: "Failed", value: (data?.kpis.failedCount ?? 0) + (data?.kpis.timeoutCount ?? 0), icon: <TrendingDown className="h-4 w-4 text-rose-500" />, unit: "" },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-sm border bg-card rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              {kpi.icon}
            </div>
            <div className="text-xl font-bold tracking-tight">
              {kpi.value}<span className="text-sm font-normal text-muted-foreground ml-0.5">{kpi.unit}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Rate Limit Quotas (RPM / TPM / RPD) ────────────────────────────── */}
      {data?.rateLimitStatus && (
        <Card className="shadow-sm border bg-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-500" />
              <span className="font-bold text-sm">Model Rate Limits &amp; Quotas</span>
              <code className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {data.rateLimitStatus.model}
              </code>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Text-out model limits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* RPM */}
            <div className="space-y-1.5 p-3.5 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Requests Per Min (RPM)</span>
                <span className="font-mono font-bold text-foreground">
                  {data.rateLimitStatus.rpmCurrent} / {data.rateLimitStatus.rpmLimit}
                </span>
              </div>
              <Progress value={data.rateLimitStatus.rpmPercent} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Current utilization</span>
                <span className="font-semibold">{data.rateLimitStatus.rpmPercent}%</span>
              </div>
            </div>

            {/* TPM */}
            <div className="space-y-1.5 p-3.5 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Tokens Per Min (TPM)</span>
                <span className="font-mono font-bold text-foreground">
                  {formatTokens(data.rateLimitStatus.tpmCurrent)} / {formatTokens(data.rateLimitStatus.tpmLimit)}
                </span>
              </div>
              <Progress value={data.rateLimitStatus.tpmPercent} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Current utilization</span>
                <span className="font-semibold">{data.rateLimitStatus.tpmPercent}%</span>
              </div>
            </div>

            {/* RPD */}
            <div className="space-y-1.5 p-3.5 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Requests Per Day (RPD)</span>
                <span className="font-mono font-bold text-foreground">
                  {data.rateLimitStatus.rpdCurrent} / {data.rateLimitStatus.rpdLimit}
                </span>
              </div>
              <Progress value={data.rateLimitStatus.rpdPercent} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Daily utilization</span>
                <span className="font-semibold">{data.rateLimitStatus.rpdPercent}%</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Feature Breakdown Table ───────────────────────────────────────── */}
      <Card className="shadow-sm border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
        <CardHeader className="border-b border-border p-4 bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            Feature Telemetry Breakdown
          </CardTitle>
          <CardDescription className="text-xs">Today&apos;s request distribution across AI features</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <th className="p-3 pl-4">Feature</th>
                  <th className="p-3 text-right">Requests</th>
                  <th className="p-3 text-right">Input Tokens</th>
                  <th className="p-3 text-right">Output Tokens</th>
                  <th className="p-3 text-right">Avg Latency</th>
                  <th className="p-3 text-center">Success</th>
                  <th className="p-3 text-center">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.featureBreakdown ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">
                      No requests recorded today. Trigger a Talent Search or AI feature to see data.
                    </td>
                  </tr>
                ) : (
                  (data?.featureBreakdown ?? []).map((fb) => (
                    <tr key={fb.feature} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-bold text-foreground flex items-center gap-2">

                        {featureLabel(fb.feature)}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">{fb.requests}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{formatTokens(fb.promptTokens)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{formatTokens(fb.completionTokens)}</td>
                      <td className="p-3 text-right font-mono text-foreground">{fb.avgLatencyMs} ms</td>
                      <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold">{fb.successCount}</td>
                      <td className="p-3 text-center text-rose-600 dark:text-rose-400 font-semibold">{fb.failedCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Error Breakdown ───────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "400 Invalid", value: data.errorBreakdown.status400, color: "text-orange-600 dark:text-orange-400" },
            { label: "403 Auth", value: data.errorBreakdown.status403, color: "text-rose-600 dark:text-rose-400" },
            { label: "429 Rate Limit", value: data.errorBreakdown.status429, color: "text-amber-600 dark:text-amber-400" },
            { label: "500 Internal", value: data.errorBreakdown.status500, color: "text-rose-600 dark:text-rose-400" },
            { label: "503 Unavailable", value: data.errorBreakdown.status503, color: "text-violet-600 dark:text-violet-400" },
            { label: "Timeouts", value: data.errorBreakdown.timeouts, color: "text-zinc-600 dark:text-zinc-400" },
          ].map((e) => (
            <Card key={e.label} className="shadow-sm border bg-card rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{e.label}</p>
              <p className={`text-2xl font-bold ${e.value > 0 ? e.color : "text-muted-foreground"}`}>{e.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Audit Log ─────────────────────────────────────────────────────── */}
      <Card className="shadow-sm border bg-card rounded-2xl py-0 gap-0 overflow-hidden">
        <CardHeader className="border-b border-border p-4 bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" />
            Request Audit Log
          </CardTitle>
          <CardDescription className="text-xs">Last 20 requests — timestamps in PH Local Time (+08:00)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <th className="p-3 pl-4">Timestamp</th>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Model</th>
                  <th className="p-3 text-right">In / Out Tokens</th>
                  <th className="p-3 text-right">Latency</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">User / Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.auditLog ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">
                      No requests recorded yet.
                    </td>
                  </tr>
                ) : (
                  (data?.auditLog ?? []).map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {log.createdAt}
                      </td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">{featureLabel(log.feature)}</td>
                      <td className="p-3 font-mono text-[10px] text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{log.model}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                        {formatTokens(log.promptTokens)} / {formatTokens(log.completionTokens)}
                      </td>
                      <td className="p-3 text-right font-mono text-foreground whitespace-nowrap">{log.latencyMs} ms</td>
                      <td className="p-3 text-center">
                        <ResponseStatusBadge status={log.responseStatus} />
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {log.userName ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-foreground text-[11px]">{log.userName}</span>
                            {log.companyName ? (
                              <span className="text-[10px] text-muted-foreground font-normal">{log.companyName}</span>
                            ) : log.companyId ? (
                              <span className="text-[10px] text-muted-foreground font-normal">Company #{log.companyId}</span>
                            ) : null}
                          </div>
                        ) : log.userId ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-foreground text-[11px]">User #{log.userId}</span>
                            {log.companyName && (
                              <span className="text-[10px] text-muted-foreground font-normal">{log.companyName}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">System / Guest</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
