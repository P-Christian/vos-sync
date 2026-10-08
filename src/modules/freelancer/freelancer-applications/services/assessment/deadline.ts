// Assessment submission deadline derivation + server resolution.
// Pure rule: for an application's current ASSESSMENT job stage with a
// non-null assessment_submission_window_days, deadline = entryTime + window
// days. entryTime is the latest vs_application_stage_history row for the
// application whose to_stage_id is the stage (created_at), falling back to
// the latest attempt's created_at. A null/absent window means no deadline.
// Deadlines are informational only: they never move or block a candidate.

import { directusGetOne, directusList } from "./directus";

export const DAY_MS = 86_400_000;

/**
 * Parses the nullable window column. Directus may return numbers or numeric
 * strings; anything non-integer or negative is treated as absent.
 */
export function parseWindowDays(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days >= 0 ? days : null;
}

/**
 * Parses a stage-entry timestamp. Directus stores Philippine wall-clock
 * strings ("YYYY-MM-DD HH:mm:ss", see nowPH) written from UTC-shifted
 * instants, so the space form is re-anchored to UTC; ISO inputs pass through
 * untouched. Returns epoch millis, or null when unparseable.
 */
export function parseEntryTime(value: string | null | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const trimmed = value.trim();
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  const millis = Date.parse(normalized);
  return Number.isNaN(millis) ? null : millis;
}

/**
 * Pure deadline derivation. Returns an ISO string, or null when there is no
 * window or no usable entry time.
 */
export function deriveAssessmentDeadline(
  entryTime: string | null | undefined,
  windowDays: number | string | null | undefined,
): string | null {
  const days = parseWindowDays(windowDays);
  if (days === null) return null;
  const baseMs = parseEntryTime(entryTime);
  if (baseMs === null) return null;
  return new Date(baseMs + days * DAY_MS).toISOString();
}

/**
 * Latest stage-entry timestamp for the application+stage pair: the newest
 * vs_application_stage_history row whose to_stage_id is the stage, falling
 * back to the newest attempt's created_at when no history row exists.
 */
export async function loadAssessmentEntryTime(
  applicationId: number,
  stageId: number,
): Promise<string | null> {
  try {
    const historyParams = new URLSearchParams({
      "filter[application_id][_eq]": String(applicationId),
      "filter[to_stage_id][_eq]": String(stageId),
      fields: "created_at",
      "sort[]": "-created_at",
      limit: "1",
    });
    const history = await directusList("vs_application_stage_history", historyParams);
    const created = history[0]?.created_at;
    if (typeof created === "string" && created !== "") return created;
  } catch (error) {
    console.error("[freelancer-assessment] stage history lookup failed:", error);
  }
  try {
    const attemptParams = new URLSearchParams({
      "filter[application_id][_eq]": String(applicationId),
      "filter[job_stage_id][_eq]": String(stageId),
      fields: "created_at",
      "sort[]": "-created_at",
      limit: "1",
    });
    const attempts = await directusList("vs_application_assessment_attempts", attemptParams);
    const created = attempts[0]?.created_at;
    return typeof created === "string" && created !== "" ? created : null;
  } catch (error) {
    console.error("[freelancer-assessment] attempt fallback lookup failed:", error);
    return null;
  }
}

/**
 * Reads the nullable assessment_submission_window_days column for one job
 * pipeline stage. Returns null when the column is absent or null.
 */
export async function loadStageWindowDays(stageId: number): Promise<number | null> {
  try {
    const row = await directusGetOne(
      "vs_job_pipeline_stages",
      stageId,
      "assessment_submission_window_days",
    );
    if (!row || !("assessment_submission_window_days" in row)) return null;
    return parseWindowDays(row.assessment_submission_window_days);
  } catch (error) {
    console.error("[freelancer-assessment] stage window lookup failed:", error);
    return null;
  }
}

/**
 * Full server resolution for the freelancer assessment GET: ISO deadline or
 * null. Never throws; lookup failures degrade to no deadline.
 */
export async function resolveAssessmentDeadline(
  applicationId: number,
  stageId: number,
): Promise<string | null> {
  const windowDays = await loadStageWindowDays(stageId);
  if (windowDays === null) return null;
  const entryTime = await loadAssessmentEntryTime(applicationId, stageId);
  return deriveAssessmentDeadline(entryTime, windowDays);
}
