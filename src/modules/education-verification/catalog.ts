import "server-only";

import { fetchRows } from "./directus";
import { activeCourseSchema, type ActiveSchoolCourse } from "./schemas";
import { requirePositiveInteger } from "./validation";

export function fetchActiveCoursesForSchool(
  schoolId: number
): Promise<readonly ActiveSchoolCourse[]> {
  const validSchoolId = requirePositiveInteger(schoolId, "schoolId");
  const query = new URLSearchParams({
    "filter[school_id][_eq]": String(validSchoolId),
    "filter[course_status][_eq]": "Active",
    fields:
      "school_course_id,school_id,course_name,course_code,degree,course_status,created_by,created_at,updated_by,updated_at",
    sort: "-created_at",
    limit: "-1",
  });
  return fetchRows(
    "course.fetchActiveForSchool",
    `/items/vs_school_course?${query.toString()}`,
    activeCourseSchema
  );
}
