"use client";

import dynamic from "next/dynamic";

export const ClientNotificationBell = dynamic(
  () => import("./ClientNotificationBell").then((mod) => mod.ClientNotificationBell),
  { ssr: false }
);
