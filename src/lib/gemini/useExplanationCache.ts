// src/lib/gemini/useExplanationCache.ts

const CACHE_PREFIX = "vos_ai_exp_";

function buildCacheKey(keyword: string, userId: number): string {
  const normKey = (keyword || "").trim().toLowerCase();
  return `${CACHE_PREFIX}${normKey}_${userId}`;
}

export function getCachedExplanation(keyword: string, userId: number): string | null {
  if (typeof window === "undefined" || !keyword || !userId) return null;
  try {
    const key = buildCacheKey(keyword, userId);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setCachedExplanation(keyword: string, userId: number, explanation: string): void {
  if (typeof window === "undefined" || !keyword || !userId || !explanation) return;
  try {
    const key = buildCacheKey(keyword, userId);
    sessionStorage.setItem(key, explanation);
  } catch {
    // Ignore storage quota errors
  }
}
