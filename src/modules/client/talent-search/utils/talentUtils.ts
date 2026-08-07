// src/modules/client/talent-search/utils/talentUtils.ts

/**
 * Resolves full Directus asset URL for image values
 */
export function getImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const cleanPath = value.replace(/^\//, "");
  return `${baseUrl}/assets/${cleanPath}`;
}
/**
 * Format experience duration
 */
export function formatExperienceYears(years: number): string {
  if (years === 0) return "No experience listed";
  if (years < 1) return `${Math.round(years * 12)} months`;
  const wholeYears = Math.floor(years);
  const months = Math.round((years - wholeYears) * 12);
  if (months === 0) return `${wholeYears} yr${wholeYears !== 1 ? "s" : ""}`;
  return `${wholeYears} yr${wholeYears !== 1 ? "s" : ""} ${months} mo`;
}

/**
 * Format a date range (e.g. "Jan 2022 – Present")
 */
export function formatDateRange(startDate: string | null, endDate: string | null, isCurrent: boolean): string {
  const format = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const start = startDate ? format(startDate) : "—";
  const end = isCurrent ? "Present" : endDate ? format(endDate) : "—";
  return `${start} – ${end}`;
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string | null | undefined, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

/**
 * Get initials from name (up to 2 chars)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Match score badge color class
 */
export function matchScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "";
  if (score >= 85) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (score >= 70) return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
  if (score >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30";
}

/**
 * Platform icon name to emoji map (for social links)
 */
export const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "🔗",
  github: "💻",
  portfolio: "🌐",
  website: "🌐",
  twitter: "🐦",
  facebook: "📘",
  instagram: "📸",
  youtube: "▶️",
  behance: "🎨",
  dribbble: "🎯",
  default: "🔗",
};

export function getPlatformIcon(platform: string): string {
  const key = platform.toLowerCase();
  for (const [k, v] of Object.entries(PLATFORM_ICONS)) {
    if (key.includes(k)) return v;
  }
  return PLATFORM_ICONS.default;
}

/**
 * Builds URLSearchParams for talent search
 */
export function buildTalentSearchParams(
  keyword: string,
  skills: string[],
  location: string,
  experienceLevel: string,
  availability: string,
  schoolId: string,
  page: number,
  limit: number,
  jobId?: string
): URLSearchParams {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (skills.length > 0) params.set("skills", skills.join(","));
  if (location) params.set("location", location);
  if (experienceLevel) params.set("experience_level", experienceLevel);
  if (availability) params.set("availability", availability);
  if (schoolId) params.set("school_id", schoolId);
  if (jobId) params.set("job_id", jobId);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return params;
}
