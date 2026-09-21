// src/modules/vos-admin/school-verification/services/schoolVerification.helpers.ts
import { SchoolVerificationRecord, SchoolVerificationKPIs } from "../types";

export function getPHISOTimestamp(): string {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return dtf.format(now).replace(" ", "T") + "+08:00";
}

/** Format current time in PH local time (Asia/Manila) as YYYY-MM-DD HH:mm:ss for MySQL datetime columns */
export function getPHTimestampForDB(): string {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return dtf.format(now);
}

/** Formats ISO / MySQL date string to PH Local Time (Asia/Manila) string for display */
export function formatPHDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    let d: Date;
    // If dateString is MySQL datetime without timezone (e.g., '2026-09-18 13:30:00' or '2026-09-18T13:30:00')
    if (typeof dateString === "string" && !dateString.includes("Z") && !dateString.includes("+") && !dateString.includes("-")) {
      d = new Date(dateString.replace(" ", "T") + "+08:00");
    } else {
      d = new Date(dateString);
    }
    if (isNaN(d.getTime())) return "N/A";

    return d.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "N/A";
  }
}

export function resolveAssetUrl(idStr: unknown): string | null {
  if (!idStr || typeof idStr !== "string" || !idStr.trim()) return null;
  const t = idStr.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/api/assets/")) return t;
  if (t.startsWith("/assets/")) return `/api${t}`;
  const parts = t.split("/");
  const fileId = parts[parts.length - 1];
  return fileId ? `/api/assets/${fileId}` : null;
}

export function computeSchoolKpis(records: SchoolVerificationRecord[]): SchoolVerificationKPIs {
  const kpis: SchoolVerificationKPIs = {
    totalCount: records.length,
    pendingCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,
  };

  records.forEach((record) => {
    const status = String(record.verification_status || "").toUpperCase();
    if (status === "PENDING_VERIFICATION" || status === "DRAFT" || status === "CORRECTION_REQUIRED") {
      kpis.pendingCount += 1;
    } else if (status === "VERIFIED") {
      kpis.verifiedCount += 1;
    } else if (status === "REJECTED" || status === "SUSPENDED") {
      kpis.rejectedCount += 1;
    }
  });

  return kpis;
}

export function formatSchoolAddress(school: Partial<SchoolVerificationRecord>): string {
  const parts = [
    school.address_line,
    school.barangay,
    school.city_municipality,
    school.province,
    school.postal_code,
    school.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No address specified";
}
