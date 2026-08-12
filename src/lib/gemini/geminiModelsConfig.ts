// src/lib/gemini/geminiModelsConfig.ts
// Single source of truth for model-aware pricing and free-tier limits.
// Update this file when Google changes pricing, adds models, or you switch tiers.
// Never hardcode these values in UI components or API routes.

export type GeminiModelConfig = {
  displayName: string;
  /** Free input tokens per day (0 if paid-only model) */
  dailyFreeInputTokens: number;
  /** Free output tokens per day (0 if paid-only model) */
  dailyFreeOutputTokens: number;
  /** USD cost per 1,000,000 input tokens (billable portion only) */
  inputPricePerMillionTokens: number;
  /** USD cost per 1,000,000 output tokens (billable portion only) */
  outputPricePerMillionTokens: number;
  /** Requests Per Minute (RPM) quota limit */
  rpmLimit: number;
  /** Tokens Per Minute (TPM) quota limit */
  tpmLimit: number;
  /** Requests Per Day (RPD) quota limit */
  rpdLimit: number;
};

export const GEMINI_MODELS_CONFIG: Record<string, GeminiModelConfig> = {
  "gemini-2.0-flash": {
    displayName: "Gemini 2.0 Flash",
    dailyFreeInputTokens: 1_000_000,
    dailyFreeOutputTokens: 500_000,
    inputPricePerMillionTokens: 0.075,
    outputPricePerMillionTokens: 0.30,
    rpmLimit: 15,
    tpmLimit: 1_000_000,
    rpdLimit: 1500,
  },
  "gemini-2.5-flash": {
    displayName: "Gemini 2.5 Flash",
    dailyFreeInputTokens: 1_000_000,
    dailyFreeOutputTokens: 500_000,
    inputPricePerMillionTokens: 0.075,
    outputPricePerMillionTokens: 0.30,
    rpmLimit: 15,
    tpmLimit: 1_000_000,
    rpdLimit: 1500,
  },
  "gemini-2.5-flash-lite": {
    displayName: "Gemini 2.5 Flash Lite",
    dailyFreeInputTokens: 1_000_000,
    dailyFreeOutputTokens: 500_000,
    inputPricePerMillionTokens: 0.018,
    outputPricePerMillionTokens: 0.072,
    rpmLimit: 15,
    tpmLimit: 250_000,
    rpdLimit: 500,
  },
  "gemini-3.1-flash-lite": {
    displayName: "Gemini 3.1 Flash Lite",
    dailyFreeInputTokens: 1_000_000,
    dailyFreeOutputTokens: 500_000,
    inputPricePerMillionTokens: 0.018,
    outputPricePerMillionTokens: 0.072,
    rpmLimit: 15,
    tpmLimit: 250_000,
    rpdLimit: 500,
  },
  "gemini-2.5-pro": {
    displayName: "Gemini 2.5 Pro",
    dailyFreeInputTokens: 0,
    dailyFreeOutputTokens: 0,
    inputPricePerMillionTokens: 1.25,
    outputPricePerMillionTokens: 10.00,
    rpmLimit: 2,
    tpmLimit: 32_000,
    rpdLimit: 50,
  },
};

/** Fallback config when the model string is not recognized */
export const GEMINI_MODELS_CONFIG_FALLBACK: GeminiModelConfig = {
  displayName: "Unknown Model",
  dailyFreeInputTokens: 1_000_000,
  dailyFreeOutputTokens: 500_000,
  inputPricePerMillionTokens: 0.018,
  outputPricePerMillionTokens: 0.072,
  rpmLimit: 15,
  tpmLimit: 250_000,
  rpdLimit: 500,
};

/**
 * Resolve model config by matching the stored model string.
 * Handles partial matches (e.g. a model returned as "models/gemini-2.5-flash").
 */
export function getModelConfig(model: string): GeminiModelConfig {
  if (!model) return GEMINI_MODELS_CONFIG_FALLBACK;

  // Direct lookup
  if (GEMINI_MODELS_CONFIG[model]) return GEMINI_MODELS_CONFIG[model];

  // Partial match — model name may be prefixed e.g. "models/gemini-2.5-flash"
  const key = Object.keys(GEMINI_MODELS_CONFIG).find((k) => model.includes(k));
  return key ? GEMINI_MODELS_CONFIG[key] : GEMINI_MODELS_CONFIG_FALLBACK;
}

/**
 * Calculate billable cost from raw daily token totals.
 * Free-tier tokens are deducted from the daily total BEFORE computing cost.
 * This must be called with the FULL day's token totals, not per-request.
 */
export function calculateBillableCost(
  dailyPromptTokens: number,
  dailyCompletionTokens: number,
  model: string
): {
  billableInputTokens: number;
  billableOutputTokens: number;
  estimatedCostUsd: number;
  freeTierActive: boolean;
} {
  const cfg = getModelConfig(model);

  const billableInputTokens = Math.max(0, dailyPromptTokens - cfg.dailyFreeInputTokens);
  const billableOutputTokens = Math.max(0, dailyCompletionTokens - cfg.dailyFreeOutputTokens);

  const estimatedCostUsd =
    (billableInputTokens / 1_000_000) * cfg.inputPricePerMillionTokens +
    (billableOutputTokens / 1_000_000) * cfg.outputPricePerMillionTokens;

  const freeTierActive = billableInputTokens === 0 && billableOutputTokens === 0;

  return {
    billableInputTokens,
    billableOutputTokens,
    estimatedCostUsd,
    freeTierActive,
  };
}
