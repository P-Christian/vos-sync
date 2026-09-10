"use client";

import { useEffect } from "react";
import { useSchoolAdmin } from "@/modules/school-admin/hooks/useSchoolAdmin";
import { SchoolProfilePage } from "@/modules/school-admin/school-profile/SchoolProfilePage";
import { SchoolAdminSkeleton } from "@/modules/school-admin/components/SchoolAdminSkeleton";

export function SchoolAdminProfileClient() {
  const { school, loading, fetchMySchool, updateSchool } = useSchoolAdmin();

  useEffect(() => {
    fetchMySchool();
  }, [fetchMySchool]);

  if (loading || !school) {
    return <SchoolAdminSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <SchoolProfilePage school={school} onUpdate={updateSchool} />
    </div>
  );
}
