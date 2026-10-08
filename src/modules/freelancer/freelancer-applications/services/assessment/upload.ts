// Proof-file upload for FILE_UPLOAD assessment tasks.
// Mirrors the client upload compensation pattern: the Directus file is
// deleted when the metadata write fails. Prior proofs are never deleted.

import {
  ASSESSMENT_PROOF_UPLOAD_POLICY,
  getUploadedFile,
  safeFileName,
  validateUploadedFile,
} from "@/lib/file-upload";
import type { ActiveAssessmentContext } from "./context";
import {
  ASSESSMENT_PROOF_FOLDER_ID,
  deleteDirectusFile,
  directusAuthHeader,
  directusBase,
} from "./directus";
import { createFirstAttempt, loadLatestAttempt, upsertResponseRow } from "./store";

export type UploadResult =
  | {
      ok: true;
      proof_file_id: string;
      proof_file_name: string;
      job_task_id: number;
      attempt_id: number;
    }
  | { ok: false; status: 400 | 409 | 422 | 502; error: string };

async function uploadToDirectus(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file, safeFileName(file.name));
  formData.append("folder", ASSESSMENT_PROOF_FOLDER_ID);
  const response = await fetch(`${directusBase()}/files`, {
    method: "POST",
    headers: directusAuthHeader(),
    body: formData,
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json().catch(() => null)) as { data?: { id?: unknown } } | null;
  return typeof json?.data?.id === "string" ? json.data.id : null;
}

export async function uploadProofFile(
  context: ActiveAssessmentContext,
  formData: FormData,
): Promise<UploadResult> {
  let file: File;
  try {
    file = getUploadedFile(formData);
  } catch {
    return { ok: false, status: 400, error: "A file is required." };
  }

  const rawTaskId = formData.get("job_task_id");
  const jobTaskId =
    typeof rawTaskId === "string" && rawTaskId.trim() !== "" ? Number(rawTaskId) : NaN;
  const snapshot =
    Number.isSafeInteger(jobTaskId) && jobTaskId > 0 ? context.taskById.get(jobTaskId) : undefined;
  if (snapshot === undefined) {
    return { ok: false, status: 422, error: "Unknown job_task_id for this assessment stage." };
  }
  if (snapshot.task_type !== "FILE_UPLOAD") {
    return { ok: false, status: 422, error: "Proof files are only accepted for FILE_UPLOAD tasks." };
  }

  try {
    await validateUploadedFile(file, ASSESSMENT_PROOF_UPLOAD_POLICY);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid file.";
    return { ok: false, status: 400, error: message };
  }

  let attempt = await loadLatestAttempt(context.application.application_id, context.stageId);
  if (!attempt) {
    attempt = await createFirstAttempt(context.application.application_id, context.stageId);
    if (!attempt) return { ok: false, status: 502, error: "Could not start the assessment attempt." };
  } else if (attempt.status !== "IN_PROGRESS") {
    return { ok: false, status: 409, error: `Upload is not allowed when the attempt is ${attempt.status}.` };
  }

  const proofFileId = await uploadToDirectus(file);
  if (!proofFileId) return { ok: false, status: 502, error: "File upload could not be completed." };

  const proofFileName = safeFileName(file.name);
  const row = await upsertResponseRow(attempt.id, jobTaskId, {
    proof_file_id: proofFileId,
    proof_file_name: proofFileName,
  });
  if (!row) {
    await deleteDirectusFile(proofFileId);
    return { ok: false, status: 502, error: "Uploaded file metadata could not be saved." };
  }

  return {
    ok: true,
    proof_file_id: proofFileId,
    proof_file_name: proofFileName,
    job_task_id: jobTaskId,
    attempt_id: attempt.id,
  };
}
