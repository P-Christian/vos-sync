"use client";

// src/modules/client/settings/components/IntegrationSettings.tsx

import React from "react";
import { AuthorizedIntegration } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, ShieldCheck, CheckCircle2, Zap } from "lucide-react";

const SAMPLE_INTEGRATIONS: AuthorizedIntegration[] = [
  {
    id: "directus-cms",
    name: "Directus Backend API Engine",
    category: "Core Database & Content Engine",
    description: "Real-time sync for company profiles, jobs, candidate profiles, and document media.",
    status: "CONNECTED",
    last_synced_at: "Just now",
    icon_name: "Database",
  },
  {
    id: "auth-jwt",
    name: "VOS Auth & JWT Session Service",
    category: "Authentication & Security",
    description: "Secure cookie-based access token verification and OTP verification workflow.",
    status: "CONNECTED",
    last_synced_at: "Active",
    icon_name: "ShieldCheck",
  },
  {
    id: "email-gateway",
    name: "VOS Email Notification Gateway",
    category: "Communication",
    description: "Delivers verification tokens, interview invites, and application status notifications.",
    status: "CONFIGURED",
    last_synced_at: "5 mins ago",
    icon_name: "Zap",
  },
];

export default function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Authorized Integrations & Platform API Services
        </h4>
        <p className="text-xs text-zinc-400 mt-0.5">
          Overview of external integrations, database connectors, and security services active on your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {SAMPLE_INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl">
                {integration.icon_name === "Database" && <Database className="h-5 w-5" />}
                {integration.icon_name === "ShieldCheck" && <ShieldCheck className="h-5 w-5" />}
                {integration.icon_name === "Zap" && <Zap className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {integration.name}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {integration.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400">{integration.description}</p>
                <p className="text-[11px] text-zinc-400">
                  Category: <span className="font-medium text-zinc-600 dark:text-zinc-300">{integration.category}</span> • Last synced: {integration.last_synced_at}
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg self-start sm:self-center">
              View Status
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
