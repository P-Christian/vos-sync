// Grouped education history for the applicant list.
// Bulk rows are bucketed per user and returned in the shared deterministic
// order (Verified, Pending, Unverified; end date desc; start date desc; id
// asc) so list summaries never depend on Directus response order.

import {
  orderEducation,
} from "@/modules/client/education/order-education";
import type { EducationItem } from "@/modules/client/applicants/types";

export interface ApplicantEducationBulkRow {
  readonly user_id: number;
  readonly employee_education_id: number;
  readonly school_id?: { readonly school_name?: string | null } | number | null;
  readonly school_name_raw?: string | null;
  readonly school_course_id?: { readonly course_name?: string | null } | number | null;
  readonly course_name_raw?: string | null;
  readonly education_status?: string | null;
  readonly start_date?: string | null;
  readonly end_date?: string | null;
}

function toListStatus(value: string | null | undefined): EducationItem["status"] {
  if (value === "Verified" || value === "Pending" || value === "Unverified") {
    return value;
  }
  return "Unverified";
}

function displaySchool(row: ApplicantEducationBulkRow): string {
  const linked =
    typeof row.school_id === "object" && row.school_id !== null
      ? row.school_id.school_name
      : null;
  return linked ?? row.school_name_raw ?? "Unknown School";
}

function displayCourse(row: ApplicantEducationBulkRow): string | null {
  const linked =
    typeof row.school_course_id === "object" && row.school_course_id !== null
      ? row.school_course_id.course_name
      : null;
  return linked ?? row.course_name_raw ?? null;
}

export function groupApplicantEducation(
  rows: readonly ApplicantEducationBulkRow[]
): Record<number, EducationItem[]> {
  const buckets: Record<number, ApplicantEducationBulkRow[]> = {};

  for (const row of rows) {
    const bucket = buckets[row.user_id];
    if (bucket) {
      bucket.push(row);
    } else {
      buckets[row.user_id] = [row];
    }
  }

  const grouped: Record<number, EducationItem[]> = {};

  for (const userId of Object.keys(buckets)) {
    const key = Number(userId);
    const ordered = orderEducation(buckets[key] ?? [], {
      status: (row) => row.education_status ?? null,
      endDate: (row) => row.end_date ?? null,
      startDate: (row) => row.start_date ?? null,
      id: (row) => row.employee_education_id,
    });
    grouped[key] = ordered.map((row) => ({
      id: row.employee_education_id,
      status: toListStatus(row.education_status),
      school_name: displaySchool(row),
      course_name: displayCourse(row),
      start_date: row.start_date ?? null,
      end_date: row.end_date ?? null,
    }));
  }

  return grouped;
}
