"use client";

import { useEffect } from "react";
import { useSchoolAdmin } from "@/modules/school-admin/hooks/useSchoolAdmin";
import { SchoolAdminCourses } from "@/modules/school-admin/components/SchoolAdminCourses";
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
      <SchoolAdminCourses 
        courses={courses} 
        onAddCourse={addCourse}
        onToggleStatus={toggleCourseStatus}
      />
    </div>
  );
}
