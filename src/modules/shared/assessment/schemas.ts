// Zod input schemas for assessment tasks and freelancer responses.
// Pure validation only. The server never fetches external_url.

import { z } from "zod";

import { TEXT_MAX_LENGTH_HARD_CAP, DEFAULT_TEXT_MAX_LENGTH } from "./types";
import type { AssessmentTask } from "./types";

const titleSchema = z.string().min(1).max(255);
const instructionsSchema = z.string().max(10000);
const sortOrderSchema = z.number().int().min(0);

const choiceOptionInputSchema = z.object({ key: z.string().min(1).max(64), label: z.string().min(1).max(500) }).strict();
const choiceOptionsInputSchema = z.array(choiceOptionInputSchema).min(2).max(20);

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::1" || /^127\./.test(host)) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

function isSafeExternalUrl(raw: string): boolean {
  const trimmed = raw.trim();
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("data:")) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username !== "" || parsed.password !== "") return false;
  return !isPrivateHostname(parsed.hostname);
}

export const externalUrlSchema = z.string().max(2048).refine(isSafeExternalUrl, {
  message: "external_url must be a public HTTPS URL without credentials",
});

export const textMaxLengthInputSchema = z.number().int().min(1).max(TEXT_MAX_LENGTH_HARD_CAP);

function uniqueOptionKeys(options: readonly { key: string }[]): boolean {
  return new Set(options.map((option) => option.key)).size === options.length;
}

const taskBaseCreateFields = {
  title: titleSchema,
  instructions: instructionsSchema.optional(),
  is_required: z.boolean(),
  sort_order: sortOrderSchema,
};

const singleChoiceCreateSchema = z.object({
  ...taskBaseCreateFields,
  task_type: z.literal("SINGLE_CHOICE"),
  choice_options: choiceOptionsInputSchema,
  correct_choice_key: z.string().min(1).max(64),
}).strict().superRefine((value, ctx) => {
  if (!uniqueOptionKeys(value.choice_options)) {
    ctx.addIssue({ code: "custom", message: "choice_options keys must be unique", path: ["choice_options"] });
  }
  if (!value.choice_options.some((option) => option.key === value.correct_choice_key)) {
    ctx.addIssue({ code: "custom", message: "correct_choice_key must match an option key", path: ["correct_choice_key"] });
  }
});

const externalTaskCreateSchema = z.object({
  ...taskBaseCreateFields,
  task_type: z.literal("EXTERNAL_TASK"),
  external_url: externalUrlSchema,
}).strict();

const fileUploadCreateSchema = z.object({ ...taskBaseCreateFields, task_type: z.literal("FILE_UPLOAD") }).strict();

const textResponseCreateSchema = z.object({
  ...taskBaseCreateFields,
  task_type: z.literal("TEXT_RESPONSE"),
  text_max_length: textMaxLengthInputSchema.default(DEFAULT_TEXT_MAX_LENGTH),
}).strict();

export const createTaskInputSchema = z.discriminatedUnion("task_type", [
  singleChoiceCreateSchema,
  externalTaskCreateSchema,
  fileUploadCreateSchema,
  textResponseCreateSchema,
]);
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

const taskBaseUpdateFields = {
  title: titleSchema.optional(),
  instructions: instructionsSchema.optional(),
  is_required: z.boolean().optional(),
  sort_order: sortOrderSchema.optional(),
};

const singleChoiceUpdateSchema = z.object({
  ...taskBaseUpdateFields,
  task_type: z.literal("SINGLE_CHOICE"),
  choice_options: choiceOptionsInputSchema.optional(),
  correct_choice_key: z.string().min(1).max(64).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.choice_options === undefined) return;
  if (!uniqueOptionKeys(value.choice_options)) {
    ctx.addIssue({ code: "custom", message: "choice_options keys must be unique", path: ["choice_options"] });
  }
  const keys = value.choice_options.map((option) => option.key);
  if (value.correct_choice_key !== undefined && !keys.includes(value.correct_choice_key)) {
    ctx.addIssue({ code: "custom", message: "correct_choice_key must match an option key", path: ["correct_choice_key"] });
  }
});

const externalTaskUpdateSchema = z.object({
  ...taskBaseUpdateFields,
  task_type: z.literal("EXTERNAL_TASK"),
  external_url: externalUrlSchema.optional(),
}).strict();

const fileUploadUpdateSchema = z.object({ ...taskBaseUpdateFields, task_type: z.literal("FILE_UPLOAD") }).strict();

const textResponseUpdateSchema = z.object({
  ...taskBaseUpdateFields,
  task_type: z.literal("TEXT_RESPONSE"),
  text_max_length: textMaxLengthInputSchema.optional(),
}).strict();

export const updateTaskInputSchema = z.discriminatedUnion("task_type", [
  singleChoiceUpdateSchema,
  externalTaskUpdateSchema,
  fileUploadUpdateSchema,
  textResponseUpdateSchema,
]);
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

const nonBlankString = (max: number): z.ZodType<string> =>
  z.string().min(1).max(max).refine((value) => value.trim().length > 0, { message: "value must not be blank" });

const singleChoiceDraftResponseSchema = z.object({
  task_type: z.literal("SINGLE_CHOICE"),
  selected_choice_key: z.string().min(1).max(64).optional(),
}).strict();
const singleChoiceSubmitResponseSchema = z.object({
  task_type: z.literal("SINGLE_CHOICE"),
  selected_choice_key: nonBlankString(64),
}).strict();
const textDraftResponseSchema = z.object({
  task_type: z.literal("TEXT_RESPONSE"),
  response_text: z.string().max(TEXT_MAX_LENGTH_HARD_CAP).optional(),
}).strict();
const textSubmitResponseSchema = z.object({
  task_type: z.literal("TEXT_RESPONSE"),
  response_text: nonBlankString(TEXT_MAX_LENGTH_HARD_CAP),
}).strict();
const externalDraftResponseSchema = z.object({
  task_type: z.literal("EXTERNAL_TASK"),
  response_text: z.string().max(TEXT_MAX_LENGTH_HARD_CAP).optional(),
}).strict();
const externalSubmitResponseSchema = z.object({
  task_type: z.literal("EXTERNAL_TASK"),
  response_text: nonBlankString(TEXT_MAX_LENGTH_HARD_CAP),
}).strict();
const fileDraftResponseSchema = z.object({
  task_type: z.literal("FILE_UPLOAD"),
  proof_file_id: z.string().min(1).max(255).optional(),
  proof_file_name: z.string().min(1).max(255).nullable().optional(),
}).strict();
const fileSubmitResponseSchema = z.object({
  task_type: z.literal("FILE_UPLOAD"),
  proof_file_id: nonBlankString(255),
  proof_file_name: z.string().min(1).max(255).nullable().optional(),
}).strict();

export const draftResponseInputSchema = z.discriminatedUnion("task_type", [
  singleChoiceDraftResponseSchema,
  externalDraftResponseSchema,
  fileDraftResponseSchema,
  textDraftResponseSchema,
]);
export const submitResponseInputSchema = z.discriminatedUnion("task_type", [
  singleChoiceSubmitResponseSchema,
  externalSubmitResponseSchema,
  fileSubmitResponseSchema,
  textSubmitResponseSchema,
]);
export type DraftResponseInput = z.infer<typeof draftResponseInputSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseInputSchema>;
export type ResponseIntent = "draft" | "submit";

export interface TaskResponseValidation {
  success: boolean;
  data?: unknown;
  error?: z.ZodError;
}

function responseFailure(message: string, path: string[], input: unknown): TaskResponseValidation {
  return {
    success: false,
    error: new z.ZodError([{ code: "custom", message, path, input }]),
  };
}

export function validateTaskResponse(
  snapshot: AssessmentTask,
  input: unknown,
  intent: ResponseIntent,
): TaskResponseValidation {
  switch (snapshot.task_type) {
    case "SINGLE_CHOICE": {
      if (intent === "draft") {
        const parsed = singleChoiceDraftResponseSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error };
        return { success: true, data: parsed.data };
      }
      const parsed = singleChoiceSubmitResponseSchema.safeParse(input);
      if (!parsed.success) return { success: false, error: parsed.error };
      const keys = snapshot.choice_options.map((option) => option.key);
      if (!keys.includes(parsed.data.selected_choice_key)) {
        return responseFailure("selected_choice_key must match a task option", ["selected_choice_key"], parsed.data.selected_choice_key);
      }
      return { success: true, data: parsed.data };
    }
    case "TEXT_RESPONSE": {
      if (intent === "draft") {
        const parsed = textDraftResponseSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error };
        const text = parsed.data.response_text;
        if (text !== undefined && text.length > snapshot.text_max_length) {
          return responseFailure("response_text exceeds the task text_max_length", ["response_text"], text);
        }
        return { success: true, data: parsed.data };
      }
      const parsed = textSubmitResponseSchema.safeParse(input);
      if (!parsed.success) return { success: false, error: parsed.error };
      if (parsed.data.response_text.length > snapshot.text_max_length) {
        return responseFailure("response_text exceeds the task text_max_length", ["response_text"], parsed.data.response_text);
      }
      return { success: true, data: parsed.data };
    }
    case "EXTERNAL_TASK": {
      const parsed = intent === "draft"
        ? externalDraftResponseSchema.safeParse(input)
        : externalSubmitResponseSchema.safeParse(input);
      if (!parsed.success) return { success: false, error: parsed.error };
      return { success: true, data: parsed.data };
    }
    case "FILE_UPLOAD": {
      const parsed = intent === "draft"
        ? fileDraftResponseSchema.safeParse(input)
        : fileSubmitResponseSchema.safeParse(input);
      if (!parsed.success) return { success: false, error: parsed.error };
      return { success: true, data: parsed.data };
    }
  }
}
