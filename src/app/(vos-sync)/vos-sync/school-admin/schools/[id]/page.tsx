import React from "react";
import { SchoolProfilePage } from "@/modules/school-admin/school-management";

export const metadata = {
  title: "School Profile | VOS Sync",
};

export default function SchoolProfileRoute({ params }: { params: { id: string } }) {
  const schoolId = parseInt(params.id, 10);
  
  return <SchoolProfilePage schoolId={schoolId} />;
}
