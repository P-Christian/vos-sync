// src/modules/matching-engine/normalizers/textNormalizer.ts

export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/[-_./]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function splitTokens(input: string | null | undefined): string[] {
  const cleaned = cleanText(input);
  if (!cleaned) return [];
  return cleaned.split(" ").filter(Boolean);
}
