// src/modules/school-admin/components/SchoolAdminNotificationBellWrapper.tsx
"use client";

import dynamic from "next/dynamic";

export const SchoolAdminNotificationBell = dynamic(
  () => import("./SchoolAdminNotificationBell").then((mod) => mod.SchoolAdminNotificationBell),
  { ssr: false }
);
