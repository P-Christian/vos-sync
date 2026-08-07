// src/modules/matching-engine/normalizers/titleNormalizer.ts

export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title
    .trim()
    .toLowerCase()
    .replace(/[-_./]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function extractTitleTokens(title: string): string[] {
  return normalizeTitle(title).split(" ").filter(Boolean);
}
