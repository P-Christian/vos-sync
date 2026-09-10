import { VsSchoolCourse, SchoolStatus } from '../../types/school-admin.types';

export interface CreateCourseDTO {
  course_name: string;
  course_code?: string | null;
}

export interface UpdateCourseDTO {
  course_name?: string;
  course_code?: string | null;
  course_status?: SchoolStatus;
}

export interface CourseFilters {
  search?: string;
  status?: string;
}
