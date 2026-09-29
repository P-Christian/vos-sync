/**
 * Read-only census of null-linked education request rows.
 *
 * Queries Directus with GET requests only and classifies every
 * `vs_course_request` / `vs_school_request` row lacking
 * `employee_education_id` via the pure classifier in
 * `src/modules/education-verification/legacy-link-audit.ts`. Prints one
 * JSON document with ids, classification statuses, and counts. There is
 * no mutation path: no apply flag exists and unknown flags are rejected.
 *
 * Usage:
 *   npx --yes tsx@4.20.6 scripts/audit-legacy-education-links.ts [--help]
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  classifyLegacyLink,
  filterCourseCandidates,
  filterSchoolCandidates,
  type AuditCourseRequest,
  type AuditEducationCandidate,
  type AuditSchoolRequest,
  type LegacyLinkStatus,
} from "../src/modules/education-verification/legacy-link-audit";

const USAGE = [
  "Usage: npx --yes tsx@4.20.6 scripts/audit-legacy-education-links.ts [--help]",
  "Read-only census of vs_course_request / vs_school_request rows lacking employee_education_id.",
  "Prints JSON { course, school, total } with scanned counts, per-class counts, and row ids+statuses.",
  "Reads NEXT_PUBLIC_API_BASE_URL and DIRECTUS_STATIC_TOKEN from the environment or .env.local.",
  "Makes GET requests only; has no apply mode.",
].join("\n");

const ownerSchema = z
  .union([z.number().int(), z.object({ user_id: z.number().int() })])
  .transform((value) => (typeof value === "number" ? value : value.user_id));

const courseRowSchema = z.object({
  course_request_id: z.number().int(),
  employee_education_id: z.number().int().nullable(),
  requested_by: ownerSchema,
  school_id: z.number().int(),
  requested_course_name: z.string(),
});

const schoolRowSchema = z.object({
  school_request_id: z.number().int(),
  employee_education_id: z.number().int().nullable(),
  requested_by: ownerSchema,
  requested_school_name: z.string(),
});

const educationRowSchema = z.object({
  employee_education_id: z.number().int(),
  user_id: z.number().int(),
  school_id: z.number().int().nullable(),
  school_course_id: z.number().int().nullable(),
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.string(),
});

const collectionSchema = z.object({
  data: z.array(z.unknown()),
  meta: z
    .object({ filter_count: z.number().int(), total_count: z.number().int() })
    .partial()
    .optional(),
});

type RowEntry = { readonly id: number; readonly status: LegacyLinkStatus };
type CensusCounts = {
  scanned: number;
  linked: number;
  deterministic_candidate: number;
  missing_candidate: number;
  ambiguous_candidate: number;
};
type MutableCensus = CensusCounts & { rows: RowEntry[] };
type Census = CensusCounts & { readonly rows: readonly RowEntry[] };

function readEnvValue(key: string): string | undefined {
  const direct = process.env[key];
  if (direct !== undefined && direct !== "") return direct;
  let text = "";
  try {
    text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return undefined;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    if (trimmed.slice(0, separator).trim() !== key) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value.charAt(0);
      const end = value.indexOf(quote, 1);
      value = end < 0 ? value.slice(1) : value.slice(1, end);
    } else {
      const token = value.split(/\s+/u)[0];
      value = token === undefined ? "" : token;
    }
    if (value !== "") return value;
  }
  return undefined;
}

async function getCollection(
  base: string,
  token: string,
  path: string,
): Promise<readonly unknown[]> {
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Directus read failed with status ${response.status}.`);
  }
  const parsed = collectionSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Directus read returned malformed data.");
  if (
    parsed.data.meta?.filter_count !== undefined &&
    parsed.data.meta.filter_count !== parsed.data.data.length
  ) {
    throw new Error("Directus read was paginated; refusing partial census.");
  }
  return parsed.data.data;
}

function emptyCensus(): MutableCensus {
  return { scanned: 0, linked: 0, deterministic_candidate: 0, missing_candidate: 0, ambiguous_candidate: 0, rows: [] };
}

function toCandidates(
  rows: readonly unknown[],
): readonly AuditEducationCandidate[] {
  return rows.flatMap((row) => {
    const candidate = educationRowSchema.safeParse(row);
    return candidate.success ? [candidate.data] : [];
  });
}

function record(census: MutableCensus, id: number, status: LegacyLinkStatus): void {
  census.scanned += 1;
  census[status] += 1;
  census.rows.push({ id, status });
}

async function main(): Promise<void> {
  for (const flag of process.argv.slice(2)) {
    if (flag === "--help" || flag === "-h") {
      console.log(USAGE);
      return;
    }
    console.error(`Unknown flag ${flag}. ${USAGE}`);
    process.exitCode = 2;
    return;
  }

  const base = readEnvValue("NEXT_PUBLIC_API_BASE_URL")?.replace(/\/$/u, "");
  const token = readEnvValue("DIRECTUS_STATIC_TOKEN");
  if (base === undefined || base === "" || token === undefined) {
    console.error("Missing NEXT_PUBLIC_API_BASE_URL or DIRECTUS_STATIC_TOKEN.");
    process.exitCode = 1;
    return;
  }

  const courseFields = "course_request_id,employee_education_id,requested_by,school_id,requested_course_name";
  const schoolFields = "school_request_id,employee_education_id,requested_by,requested_school_name";
  const educationFields = "employee_education_id,user_id,school_id,school_course_id,school_name_raw,course_name_raw,education_status";

  const courseRows = await getCollection(
    base,
    token,
    `/items/vs_course_request?filter[employee_education_id][_null]=true&fields=${courseFields}&limit=-1&meta=total_count`,
  );
  const schoolRows = await getCollection(
    base,
    token,
    `/items/vs_school_request?filter[employee_education_id][_null]=true&fields=${schoolFields}&limit=-1&meta=total_count`,
  );

  const course: MutableCensus = emptyCensus();
  for (const raw of courseRows) {
    const parsed = courseRowSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Course request row failed validation.");
    const request: AuditCourseRequest = {
      kind: "course",
      course_request_id: parsed.data.course_request_id,
      employee_education_id: parsed.data.employee_education_id,
      requested_by: parsed.data.requested_by,
      school_id: parsed.data.school_id,
      requested_course_name: parsed.data.requested_course_name,
    };
    let candidates: readonly AuditEducationCandidate[] = [];
    if (request.employee_education_id === null) {
      candidates = toCandidates(
        await getCollection(
          base,
          token,
          `/items/vs_employee_education?filter[user_id][_eq]=${request.requested_by}` +
            `&filter[school_id][_eq]=${request.school_id}` +
            `&filter[education_status][_eq]=Pending&fields=${educationFields}&limit=-1&meta=total_count`,
        ),
      );
    }
    const status = classifyLegacyLink(
      request,
      filterCourseCandidates(request, candidates),
    );
    record(course, request.course_request_id, status);
  }

  const school: MutableCensus = emptyCensus();
  for (const raw of schoolRows) {
    const parsed = schoolRowSchema.safeParse(raw);
    if (!parsed.success) throw new Error("School request row failed validation.");
    const request: AuditSchoolRequest = {
      kind: "school",
      school_request_id: parsed.data.school_request_id,
      employee_education_id: parsed.data.employee_education_id,
      requested_by: parsed.data.requested_by,
      requested_school_name: parsed.data.requested_school_name,
    };
    let candidates: readonly AuditEducationCandidate[] = [];
    if (request.employee_education_id === null) {
      candidates = toCandidates(
        await getCollection(
          base,
          token,
          `/items/vs_employee_education?filter[user_id][_eq]=${request.requested_by}` +
            `&filter[school_id][_null]=true` +
            `&filter[education_status][_eq]=Pending&fields=${educationFields}&limit=-1&meta=total_count`,
        ),
      );
    }
    const status = classifyLegacyLink(
      request,
      filterSchoolCandidates(request, candidates),
    );
    record(school, request.school_request_id, status);
  }

  const total: Census = {
    scanned: course.scanned + school.scanned,
    linked: course.linked + school.linked,
    deterministic_candidate:
      course.deterministic_candidate + school.deterministic_candidate,
    missing_candidate: course.missing_candidate + school.missing_candidate,
    ambiguous_candidate: course.ambiguous_candidate + school.ambiguous_candidate,
    rows: [...course.rows, ...school.rows],
  };
  console.log(JSON.stringify({ course, school, total }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Audit failed.");
  process.exitCode = 1;
});
