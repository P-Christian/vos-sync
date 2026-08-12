// src/lib/gemini/geminiClient.ts

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 5000;

export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface GeminiRawResult {
  text: string;
  model: string;
  usageMetadata: GeminiUsageMetadata | null;
  finishReason: string | null;
  httpStatus: number;
  timedOut: boolean;
  errorMessage: string | null;
}

/**
 * Internal raw call — returns the full GCP response including usageMetadata and finishReason.
 * Used exclusively by the monitoring middleware (geminiMonitoring.ts).
 * Do NOT call this directly from application features — use callGeminiMonitored() instead.
 */
export async function callGeminiRaw(prompt: string): Promise<GeminiRawResult> {
  if (!GEMINI_API_KEY) {
    return {
      text: "",
      model: GEMINI_MODEL,
      usageMetadata: null,
      finishReason: "ERROR",
      httpStatus: 0,
      timedOut: false,
      errorMessage: "GEMINI_API_KEY is not set in environment.",
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const httpStatus = res.status;

    if (!res.ok) {
      const body = await res.text();
      return {
        text: "",
        model: GEMINI_MODEL,
        usageMetadata: null,
        finishReason: "ERROR",
        httpStatus,
        timedOut: false,
        errorMessage: `Gemini API error ${httpStatus}: ${body.slice(0, 300)}`,
      };
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const finishReason: string | null = json?.candidates?.[0]?.finishReason ?? null;
    const rawUsage = json?.usageMetadata ?? null;
    const usageMetadata: GeminiUsageMetadata | null = rawUsage
      ? {
          promptTokenCount: rawUsage.promptTokenCount ?? 0,
          candidatesTokenCount: rawUsage.candidatesTokenCount ?? 0,
          totalTokenCount: rawUsage.totalTokenCount ?? 0,
        }
      : null;

    return {
      text: text.trim(),
      model: GEMINI_MODEL,
      usageMetadata,
      finishReason,
      httpStatus,
      timedOut: false,
      errorMessage: null,
    };
  } catch (err) {
    clearTimeout(timeout);
    const timedOut = (err as Error)?.name === "AbortError";
    return {
      text: "",
      model: GEMINI_MODEL,
      usageMetadata: null,
      finishReason: timedOut ? "TIMEOUT" : "ERROR",
      httpStatus: timedOut ? 408 : 500,
      timedOut,
      errorMessage: timedOut
        ? `Request timed out after ${GEMINI_TIMEOUT_MS}ms`
        : ((err as Error)?.message ?? "Unknown error"),
    };
  }
}

export async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("[gemini] ⚠️ GEMINI_API_KEY is not set in environment.");
    throw new Error("GEMINI_API_KEY is not set in environment.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  console.log(`[gemini] 📤 Sending to ${GEMINI_MODEL}:`);
  console.log(`[gemini] 📤 Prompt:\n${prompt.slice(0, 500)}${prompt.length > 500 ? "\n...(truncated)" : ""}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[gemini] ❌ API error ${res.status}:`, body);
      throw new Error(`Gemini API error ${res.status}: ${body}`);
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log(`[gemini] 📥 Response:\n${text.trim()}`);
    return text.trim();
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === "AbortError") {
      console.error(`[gemini] ⏱️  Request timed out after ${GEMINI_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

/** Safe wrapper — returns null instead of throwing on any failure */
export async function callGeminiSafe(prompt: string): Promise<string | null> {
  try {
    return await callGemini(prompt);
  } catch (err) {
    console.warn("[gemini] ⚠️  callGeminiSafe caught error:", (err as Error)?.message ?? err);
    return null;
  }
}

/** 
 * Multimodal call for uploading a file + text prompt.
 * Accepts base64 encoded data and a mimeType.
 */
export async function callGeminiWithFile(prompt: string, base64Data: string, mimeType: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("[gemini] ⚠️ GEMINI_API_KEY is not set in environment.");
    throw new Error("GEMINI_API_KEY is not set in environment.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  console.log(`[gemini] 📤 Sending multimodal request to ${GEMINI_MODEL}:`);
  console.log(`[gemini] 📤 Prompt:\n${prompt.slice(0, 500)}${prompt.length > 500 ? "\n...(truncated)" : ""}`);
  console.log(`[gemini] 📤 File Info: mimeType=${mimeType}, length=${base64Data.length}`);

  const controller = new AbortController();
  // Extending timeout for file processing if needed
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS * 2);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[gemini] ❌ API error ${res.status}:`, body);
      throw new Error(`Gemini API error ${res.status}: ${body}`);
    }

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log(`[gemini] 📥 Response:\n${text.trim().slice(0, 500)}${text.trim().length > 500 ? "\n...(truncated)" : ""}`);
    return text.trim();
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === "AbortError") {
      console.error(`[gemini] ⏱️  Request timed out after ${GEMINI_TIMEOUT_MS * 2}ms`);
    }
    throw err;
  }
}
