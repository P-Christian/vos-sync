const EXPLICIT_TIME_ZONE_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const ISO_DATE_TIME_WITHOUT_ZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

/**
 * Parse a datetime returned by Directus.
 *
 * Directus datetime fields are UTC, but depending on its serialization
 * configuration the REST API can omit the trailing `Z`. JavaScript treats
 * those timezone-less values as server/browser local time, so make the UTC
 * contract explicit before parsing. Explicit `Z` and numeric offsets retain
 * their original meaning.
 */
export function parseDirectusUtcDateTime(value: unknown): number {
  if (typeof value !== "string") return Number.NaN;

  const dateTime = value.trim();
  if (!dateTime) return Number.NaN;

  const normalized =
    ISO_DATE_TIME_WITHOUT_ZONE_PATTERN.test(dateTime) &&
    !EXPLICIT_TIME_ZONE_PATTERN.test(dateTime)
      ? `${dateTime}Z`
      : dateTime;

  return Date.parse(normalized);
}

/** Return a Directus datetime as an unambiguous UTC API timestamp. */
export function directusUtcDateTimeToIso(value: unknown): string | null {
  const timestamp = parseDirectusUtcDateTime(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
