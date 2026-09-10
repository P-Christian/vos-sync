import { VsSchoolCourse, SchoolStatus } from '../../types/school-admin.types';

export function formatCourseCode(code: string | null | undefined): string {
  if (!code) return 'N/A';
  return code.trim().toUpperCase();
}

export function getCourseStatusBadgeVariant(status: SchoolStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'Active':
      return 'default';
    case 'Inactive':
      return 'secondary';
    case 'Pending':
      return 'outline';
    case 'Draft':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function filterCourses(
  courses: VsSchoolCourse[],
  searchQuery: string,
  statusFilter: string
): VsSchoolCourse[] {
  return courses.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      course.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.course_code && course.course_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      !statusFilter || statusFilter === 'all' || course.course_status === statusFilter;

    return matchesSearch && matchesStatus;
  });
}
