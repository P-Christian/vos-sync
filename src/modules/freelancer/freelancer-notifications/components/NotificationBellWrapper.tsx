"use client";

import dynamic from "next/dynamic";

export const NotificationBell = dynamic(
  () => import("./NotificationBell").then((mod) => mod.NotificationBell),
  { ssr: false }
);
