"use client";

// src/app/(vos-sync)/vos-sync/vos-admin/gemini-monitoring/page.tsx

import React from "react";
import { GeminiMonitoringDashboard } from "@/modules/vos-admin/gemini-monitoring";

export default function GeminiMonitoringPage() {
  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pb-24">
      <GeminiMonitoringDashboard />
    </main>
  );
}
