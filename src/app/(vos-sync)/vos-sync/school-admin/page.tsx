"use client";

import { useEffect } from "react";
import { useSchoolAdmin } from "@/modules/school-admin/hooks/useSchoolAdmin";
import { SchoolAdminDashboard } from "@/modules/school-admin/components/SchoolAdminDashboard";
import { SchoolAdminProfile } from "@/modules/school-admin/components/SchoolAdminProfile";
import { SchoolAdminSkeleton } from "@/modules/school-admin/components/SchoolAdminSkeleton";

export default function SchoolAdminPage() {
  const { school, loading, fetchMySchool, updateSchool } = useSchoolAdmin();

  useEffect(() => {
    fetchMySchool();
  }, [fetchMySchool]);

  if (loading || !school) {
    return <SchoolAdminSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <SchoolAdminDashboard school={school} />
      <SchoolAdminProfile school={school} onUpdate={updateSchool} />
    </div>
  );
}
