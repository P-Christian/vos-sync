// src/app/api/vos-admin/gemini-monitoring/route.ts
// Aggregates Gemini telemetry from Directus gemini_requests.
// All cost/billing computed dynamically from GEMINI_MODELS_CONFIG — nothing stored in DB.

import { NextResponse } from "next/server";
import {
  fetchTodayRequests,
  fetchRecentRequests,
  computeKPIs,
  computeFeatureBreakdown,
  computeErrorBreakdown,
  computeFreeTierStatus,
  computeRateLimitStatus,
  resolveAttributionNames,
} from "@/modules/vos-admin/gemini-monitoring/services/geminiMonitoring.repo";

export const revalidate = 0;

export async function GET() {
  const configuredModel =
    process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash";
  const apiKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  );

  // PH local timestamp for response
  const phTimezoneOffsetMs = 8 * 3600 * 1000;
  const nowPh = new Date(Date.now() + phTimezoneOffsetMs).toISOString().replace("Z", "+08:00");

  // Fetch from Directus in parallel
  const [todayRows, recentRows] = await Promise.all([
    fetchTodayRequests(),
    fetchRecentRequests(20),
  ]);

  const kpis = computeKPIs(todayRows, recentRows);
  const featureBreakdown = computeFeatureBreakdown(todayRows);
  const errorBreakdown = computeErrorBreakdown(todayRows);
  const freeTierStatus = computeFreeTierStatus(todayRows, configuredModel);
  const rateLimitStatus = computeRateLimitStatus(recentRows, todayRows, configuredModel);

  // Determine service health from recent traffic — no GCP endpoint ping
  // NO_DATA = collection not yet set up or no requests made today
  // HEALTHY  = last 5 min success rate ≥ 95% and latency < 3s
  // DEGRADED = recent failures or slow responses
  // UNAVAILABLE = recent requests exist but majority are failing
  let serviceHealth: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "NO_DATA";
  if (recentRows.length === 0) {
    serviceHealth = "NO_DATA";
  } else if (kpis.recentSuccessRate >= 95 && kpis.recentAvgLatencyMs < 3000) {
    serviceHealth = "HEALTHY";
  } else if (kpis.recentSuccessRate >= 50) {
    serviceHealth = "DEGRADED";
  } else {
    serviceHealth = "UNAVAILABLE";
  }

  // Batch resolve user names and company names for attribution
  const userIds = recentRows.map((r) => r.user_id);
  const companyIds = recentRows.map((r) => r.company_id);
  const { userNames, companyNames } = await resolveAttributionNames(userIds, companyIds);

  // Audit log — most recent 20 requests with PH timestamps
  const auditLog = recentRows.map((r) => ({
    id: r.id,
    requestId: r.request_id,
    feature: r.feature,
    provider: r.provider,
    model: r.model,
    endpoint: r.endpoint,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    totalTokens: r.total_tokens,
    finishReason: r.finish_reason,
    responseStatus: r.response_status,
    latencyMs: r.latency_ms,
    httpStatus: r.status,
    errorMessage: r.error_message,
    userId: r.user_id,
    companyId: r.company_id,
    userName: r.user_id ? userNames[r.user_id] ?? `User #${r.user_id}` : null,
    companyName: r.company_id ? companyNames[r.company_id] ?? `Company #${r.company_id}` : null,
    createdAt: r.created_at,
  }));

  return NextResponse.json({
    success: true,
    configuredModel,
    apiKeyConfigured,
    serviceHealth,
    lastSuccessAt: kpis.lastSuccessAt,
    recentSuccessRate: kpis.recentSuccessRate,
    recentAvgLatencyMs: kpis.recentAvgLatencyMs,
    kpis,
    freeTierStatus,
    rateLimitStatus,
    featureBreakdown,
    errorBreakdown,
    auditLog,
    lastCheckedAt: nowPh,
  });
}
