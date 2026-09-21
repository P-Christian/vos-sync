"use client";

import { useEffect } from "react";
import { useSchoolAdmin } from "@/modules/school-admin/hooks/useSchoolAdmin";
import { SchoolAdminDashboard } from "@/modules/school-admin/components/SchoolAdminDashboard";
import { DashboardSkeleton } from "@/modules/school-admin/components/SchoolAdminSkeleton";

export function SchoolAdminDashboardClient() {
  const { school, loading, fetchMySchool } = useSchoolAdmin();

  useEffect(() => {
    fetchMySchool();
  }, [fetchMySchool]);

  if (loading || !school) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <SchoolAdminDashboard school={school} />
    </div>
  );
}
