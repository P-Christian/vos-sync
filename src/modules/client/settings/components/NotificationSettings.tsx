"use client";

// src/modules/client/settings/components/NotificationSettings.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-md">
            <Bell className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Notification & Alert Center
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg">
              Manage your detailed email and in-app alerts for candidate applications, interview schedules, and company announcements.
            </p>
          </div>
        </div>

        <Link href="/vos-sync/client/notifications">
          <Button className="h-10 px-5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2">
            Open Notification Preferences
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Email Notification Frequency
          </div>
          <p className="text-xs text-zinc-400">
            Instant updates sent directly to your registered employer account email for new candidate applications.
          </p>
        </div>

        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            In-App Desktop Badges
          </div>
          <p className="text-xs text-zinc-400">
            Real-time portal badges for interview updates, status changes, and applicant submissions.
          </p>
        </div>
      </div>
    </div>
  );
}
