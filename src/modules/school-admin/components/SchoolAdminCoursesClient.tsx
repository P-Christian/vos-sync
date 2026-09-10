"use client";

import { useEffect } from "react";
import { useSchoolAdmin } from "@/modules/school-admin/hooks/useSchoolAdmin";
import { SchoolCoursesPage } from "@/modules/school-admin/school-courses/SchoolCoursesPage";
import { SchoolAdminSkeleton } from "@/modules/school-admin/components/SchoolAdminSkeleton";

export function SchoolAdminCoursesClient() {
  const { courses, loading, fetchMyCourses, addCourse, toggleCourseStatus } = useSchoolAdmin();

  useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  if (loading) {
    return <SchoolAdminSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <SchoolCoursesPage 
        courses={courses} 
        onAddCourse={addCourse} 
        onToggleStatus={toggleCourseStatus} 
      />
    </div>
  );
}
