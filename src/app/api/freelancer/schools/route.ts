import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  SCHOOL_SEARCH_LIMIT,
  freelancerSchoolSchema,
  isBlankSearchTerm,
  searchClassifiedSchools,
} from "@/modules/vos-admin/school-verification/services/schoolRouteSearch.repo";

// Plan 2 Todo 4: public freelancer search. Returns minimal school identity
// plus the server-derived verification_route across all three selectable
// states (DIRECT_REVIEW | AWAITING_ACTIVATION | AWAITING_REGISTRATION).
// Rejected/suspended/inactive/contradictory rows are excluded server-side and
// no admin PII (created_by and friends) ever leaves this endpoint. Freelancer
// free text creates no school row: this surface is read-only.
const searchTermSchema = z
  .string()
  .trim()
  .min(1, "Search term must not be empty.")
  .max(100, "Search term must be at most 100 characters.");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("search");
    if (isBlankSearchTerm(raw)) {
      return NextResponse.json({ schools: [] });
    }
    const termResult = searchTermSchema.safeParse(raw);
    if (!termResult.success) {
      const [firstIssue] = termResult.error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid search term." },
        { status: 400 }
      );
    }

    const classified = await searchClassifiedSchools(termResult.data);
    const schools = freelancerSchoolSchema
      .array()
      .max(SCHOOL_SEARCH_LIMIT)
      .parse(
        classified.map((row) => ({
          school_id: row.school_id,
          school_name: row.school_name,
          city_municipality: row.city_municipality,
          province: row.province,
          verification_route: row.verification_route,
        }))
      );
    return NextResponse.json({ schools });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const [firstIssue] = error.issues;
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid school data." },
        { status: 400 }
      );
    }
    // Sanitized dependency failure: never leak storage internals.
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }
}
