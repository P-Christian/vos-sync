// Shared deterministic ordering for education rows.
// Every applicant/talent surface that renders more than one education record
// sorts through these helpers so row order never depends on response order.

export const EDUCATION_STATUS_RANK: Readonly<Record<string, number>> = {
  Verified: 0,
  Pending: 1,
  Unverified: 2,
};

const UNKNOWN_STATUS_RANK = 3;

export interface EducationOrderAccessors<T> {
  readonly status: (row: T) => string | null | undefined;
  readonly endDate: (row: T) => string | null | undefined;
  readonly startDate: (row: T) => string | null | undefined;
  readonly id: (row: T) => number | string | null | undefined;
}

export function educationStatusRank(
  status: string | null | undefined
): number {
  if (status === null || status === undefined) {
    return UNKNOWN_STATUS_RANK;
  }
  return EDUCATION_STATUS_RANK[status] ?? UNKNOWN_STATUS_RANK;
}

function compareDateDesc(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";
  if (aMissing && bMissing) {
    return 0;
  }
  if (aMissing) {
    return 1;
  }
  if (bMissing) {
    return -1;
  }
  if (a === b) {
    return 0;
  }
  return a > b ? -1 : 1;
}

function compareIdAsc(
  a: number | string | null | undefined,
  b: number | string | null | undefined
): number {
  if (a === b) {
    return 0;
  }
  if (a === null || a === undefined) {
    return 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const aText = String(a);
  const bText = String(b);
  if (aText === bText) {
    return 0;
  }
  return aText < bText ? -1 : 1;
}

export function compareEducation<T>(
  a: T,
  b: T,
  get: EducationOrderAccessors<T>
): number {
  const rankDiff = educationStatusRank(get.status(a)) - educationStatusRank(get.status(b));
  if (rankDiff !== 0) {
    return rankDiff;
  }
  const endDiff = compareDateDesc(get.endDate(a), get.endDate(b));
  if (endDiff !== 0) {
    return endDiff;
  }
  const startDiff = compareDateDesc(get.startDate(a), get.startDate(b));
  if (startDiff !== 0) {
    return startDiff;
  }
  return compareIdAsc(get.id(a), get.id(b));
}

export function orderEducation<T>(
  rows: readonly T[],
  get: EducationOrderAccessors<T>
): T[] {
  return [...rows].sort((a, b) => compareEducation(a, b, get));
}
