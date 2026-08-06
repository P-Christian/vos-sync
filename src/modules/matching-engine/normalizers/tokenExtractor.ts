// src/modules/matching-engine/normalizers/tokenExtractor.ts

import { cleanText, splitTokens } from "./textNormalizer";

export function stem(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ment") && w.length > 6) return w.slice(0, -4);
  if (w.endsWith("er") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("or") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}

export function extractStemmedTokens(input: string): string[] {
  return splitTokens(input).map(stem);
}

export function splitCompoundToken(token: string, vocabulary: Set<string>): string[] {
  const clean = cleanText(token).replace(/\s+/g, "");
  if (!clean || clean.length < 5) return [clean];

  for (let i = 3; i <= clean.length - 3; i++) {
    const part1 = clean.slice(0, i);
    const part2 = clean.slice(i);
    if (vocabulary.has(part1) && vocabulary.has(part2)) {
      return [part1, part2];
    }
  }

  return [clean];
}

export function computeJaccardSimilarity(strA: string, strB: string): number {
  const stemsA = extractStemmedTokens(strA);
  const stemsB = extractStemmedTokens(strB);

  if (stemsA.length === 0 || stemsB.length === 0) return 0;
  const setA = new Set(stemsA);
  const setB = new Set(stemsB);

  let intersectionCount = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersectionCount++;
  });

  const unionSize = new Set([...setA, ...setB]).size;
  return Number((intersectionCount / unionSize).toFixed(2));
}
