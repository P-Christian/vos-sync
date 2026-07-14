import React from "react";
import { SchoolListPage } from "@/modules/school-admin/school-management";

export const metadata = {
  title: "Schools | VOS Sync",
};

export default function SchoolsRoute() {
  return <SchoolListPage />;
}
