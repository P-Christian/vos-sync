import React from "react";
import { SchoolProfilePage } from "@/modules/vos-admin/school-management";

export const metadata = {
  title: "School Profile | VOS Sync",
};

export default async function SchoolProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schoolId = parseInt(id, 10);
  
  return <SchoolProfilePage schoolId={schoolId} />;
}
