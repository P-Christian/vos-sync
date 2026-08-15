// src/modules/client/applicants/utils/applicantUtils.ts

/**
 * Resolves safe avatar image URL for applicants
 */
export function getApplicantAvatarUrl(image?: string | null): string {
  if (!image || typeof image !== "string" || !image.trim()) return "";
  const clean = image.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("/api/")) return clean;
  const assetId = clean.replace(/^\//, "");
  return `/api/client/assets/${assetId}`;
}

/**
 * Extracts 1-2 letter initials from a candidate name
 */
export function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Formats a date string to Philippine local date format
 */
export function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Formats a date range e.g. "Jan 2022 – Present"
 */
export function formatDateRange(start?: string | null, end?: string | null, current?: boolean): string {
  const s = formatDate(start) ?? "—";
  const e = current ? "Present" : formatDate(end) ?? "Present";
  return `${s} – ${e}`;
}

/**
 * Formats PHP currency
 */
export function formatCurrency(value?: number | null): string | null {
  if (value === null || value === undefined) return null;
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₱${value.toLocaleString()}`;
  }
}

/**
 * Formats relative time elapsed
 */
export function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
