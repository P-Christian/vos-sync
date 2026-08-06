// src/lib/gemini/geminiClient.ts

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 5000;

export async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error("[gemini] ❌ GEMINI_API_KEY is not set in .env.local");
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
