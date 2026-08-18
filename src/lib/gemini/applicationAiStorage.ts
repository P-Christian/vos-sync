// src/lib/gemini/applicationAiStorage.ts
// Unified Persistence Layer for Application & Candidate AI Intelligence.
// Interacts with `vs_application_ai_analysis` using an append-only, immutable history model.

export type ApplicationAiMode =
  | "CANDIDATE_EVALUATION"
  | "BEST_MATCH"
  | "MATCH_EXPLAINER"
  | "INTERVIEW_ANALYSIS"
  | "SCREENING_ANALYSIS";

export interface AlternativeJobMatch {
  job_id: number;
  job_title: string;
  match_score: number;
  reasoning: string;
}

export interface ApplicationAiAnalysisRecord {
  analysis_id: number;
  evaluation_mode: ApplicationAiMode;
  application_id: number;
  job_id: number;
  user_id: number;
  company_id: number;
  is_current: number; // 1 or 0
  superseded_by_analysis_id?: number | null;
  match_score?: number | null;
  fit_level?: string | null;
  executive_summary?: string | null;
  strengths?: string[] | null;
  gaps_or_considerations?: string[] | null;
  screening_assessment?: Record<string, unknown> | string | null;
  recommendation?: Record<string, unknown> | string | null;
  alternative_job_recommendations?: AlternativeJobMatch[] | null;
  evidence?: Array<Record<string, unknown>> | null;
  match_breakdown?: Record<string, number> | null;
  raw_ai_response?: Record<string, unknown> | null;
  ai_model?: string | null;
  prompt_version?: string | null;
  evaluated_by_user_id?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface SaveAiAnalysisParams {
  evaluation_mode: ApplicationAiMode;
  application_id: number;
  job_id: number;
  user_id: number;
  company_id: number;
  match_score?: number | null;
  fit_level?: string | null;
  executive_summary?: string | null;
  strengths?: string[] | null;
  gaps_or_considerations?: string[] | null;
  screening_assessment?: Record<string, unknown> | string | null;
  recommendation?: Record<string, unknown> | string | null;
  alternative_job_recommendations?: AlternativeJobMatch[] | null;
  evidence?: Array<Record<string, unknown>> | null;
  match_breakdown?: Record<string, number> | null;
  raw_ai_response?: Record<string, unknown> | null;
  ai_model?: string | null;
  prompt_version?: string | null;
  evaluated_by_user_id?: number | null;
}

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash";

function getDirectusHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

/**
 * Fetch the currently active (is_current = 1) AI analysis record for a given application and mode.
 */
export async function getActiveApplicationAiAnalysis(
  applicationId: number,
  mode: ApplicationAiMode
): Promise<ApplicationAiAnalysisRecord | null> {
  if (!applicationId || !DIRECTUS_BASE) return null;

  try {
    const url = `${DIRECTUS_BASE}/items/vs_application_ai_analysis?filter[application_id][_eq]=${applicationId}&filter[evaluation_mode][_eq]=${mode}&filter[is_current][_eq]=1&sort[]=-created_at&limit=1`;
    const res = await fetch(url, { headers: getDirectusHeaders(), cache: "no-store" });

    if (!res.ok) return null;
    const json = await res.json();
    return (json.data?.[0] as ApplicationAiAnalysisRecord) ?? null;
  } catch (err) {
    console.warn(`[applicationAiStorage] Error querying active analysis for app ${applicationId} mode ${mode}:`, err);
    return null;
  }
}

/**
 * Save a fresh AI analysis record using append-only immutable history:
 * 1. Queries any existing active record (is_current = 1).
 * 2. Inserts new record with is_current = 1.
 * 3. Updates previous record with is_current = 0 and superseded_by_analysis_id = newRecordId.
 */
export async function saveApplicationAiAnalysis(
  params: SaveAiAnalysisParams
): Promise<ApplicationAiAnalysisRecord | null> {
  if (!params.application_id || !DIRECTUS_BASE) return null;

  try {
    // 1. Fetch current active record ID for this (application_id, mode)
    const prevRecord = await getActiveApplicationAiAnalysis(params.application_id, params.evaluation_mode);

    // 2. Insert new record
    const payload = {
      ...params,
      is_current: 1,
      ai_model: params.ai_model || GEMINI_MODEL,
      prompt_version: params.prompt_version || "1.0",
    };

    const insertRes = await fetch(`${DIRECTUS_BASE}/items/vs_application_ai_analysis`, {
      method: "POST",
      headers: getDirectusHeaders(),
      body: JSON.stringify(payload),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text().catch(() => "");
      console.warn(`[applicationAiStorage] Could not insert vs_application_ai_analysis record:`, errText);
      return null;
    }

    const insertJson = await insertRes.json();
    const createdRecord = insertJson.data as ApplicationAiAnalysisRecord;

    // 3. Mark previous record as superseded
    if (prevRecord?.analysis_id && createdRecord?.analysis_id) {
      await fetch(`${DIRECTUS_BASE}/items/vs_application_ai_analysis/${prevRecord.analysis_id}`, {
        method: "PATCH",
        headers: getDirectusHeaders(),
        body: JSON.stringify({
          is_current: 0,
          superseded_by_analysis_id: createdRecord.analysis_id,
        }),
      }).catch((err) => {
        console.warn(`[applicationAiStorage] Failed to mark previous analysis as superseded:`, err);
      });
    }

    return createdRecord;
  } catch (err) {
    console.error("[applicationAiStorage] Error saving AI analysis:", err);
    return null;
  }
}

/**
 * Fetch full version history of evaluations for an application.
 */
export async function getApplicationAiAnalysisHistory(
  applicationId: number,
  mode?: ApplicationAiMode
): Promise<ApplicationAiAnalysisRecord[]> {
  if (!applicationId || !DIRECTUS_BASE) return [];

  try {
    let url = `${DIRECTUS_BASE}/items/vs_application_ai_analysis?filter[application_id][_eq]=${applicationId}&sort[]=-created_at&limit=50`;
    if (mode) {
      url += `&filter[evaluation_mode][_eq]=${mode}`;
    }
    const res = await fetch(url, { headers: getDirectusHeaders(), cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as ApplicationAiAnalysisRecord[]) ?? [];
  } catch {
    return [];
  }
}
