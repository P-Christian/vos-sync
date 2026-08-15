// src/modules/client/dashboard/components/DashboardHeader.tsx
"use client";

import React, { useMemo } from "react";
import { CompanyInfo } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, ShieldAlert, Building2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  company: CompanyInfo;
  userName?: string;
}

export default function DashboardHeader({ company, userName }: DashboardHeaderProps) {
  const router = useRouter();

  const isVerified = company.verification_status === "VERIFIED";

  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = useMemo(() => {
    if (company.company_name?.trim()) return company.company_name;
    if (userName?.trim()) return userName.split(" ")[0];
    return "Partner";
  }, [company.company_name, userName]);

  const locationStr = useMemo(() => {
    return [company.company_city, company.company_province].filter(Boolean).join(", ");
  }, [company.company_city, company.company_province]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl border bg-card p-6 sm:p-7 shadow-xs overflow-hidden"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="h-13 w-13 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="h-6.5 w-6.5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {greeting}, {displayName}
              </h1>
              {isVerified ? (
                <Badge className="bg-primary/15 text-primary border-primary/25 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified Profile
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Pending Verification
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
              <span>Here&apos;s an overview of your hiring activity.</span>
              {locationStr && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {locationStr}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => router.push("/vos-sync/client/jobs")}
            disabled={!isVerified}
            className="h-11 rounded-xl font-semibold px-6 text-sm shadow-sm transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="h-4.5 w-4.5" />
            Post a Job
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
