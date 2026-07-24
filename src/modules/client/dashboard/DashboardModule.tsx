// src/modules/client/dashboard/DashboardModule.tsx
"use client";

import React, { useState, useEffect } from "react";
import KpiCards from "./components/KpiCards";
import RecentJobs from "./components/RecentJobs";
import RecentApplicants from "./components/RecentApplicants";
import DashboardFilters from "./components/DashboardFilters";
import { DashboardData, FilterState, CompanyInfo } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Plus,
  ShieldCheck,
  Mail,
  CheckCircle,
  Building2,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardModule({ userName }: { userName?: string }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    department: "",
    status: "",
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch("/api/client/dashboard");
        if (!response.ok) {
          throw new Error("Failed to load dashboard metrics.");
        }
        const json = await response.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred fetching dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground font-medium animate-pulse text-sm">
          Synchronizing dashboard workspaces...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Card className="border-rose-100 dark:border-rose-900/30 shadow-md">
          <CardContent className="p-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Sync Failure</h3>
            <p className="text-sm text-muted-foreground">{error || "Could not retrieve company profile information."}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = data.company ?? ({} as CompanyInfo);
  const stats = data.stats ?? { activeJobs: 0, hiredCount: 0, pendingInterviews: 0, totalApplicants: 0, totalJobs: 0 };
  const recentJobs = data.recentJobs ?? [];
  const recentApplicants = data.recentApplicants ?? [];
  const isVerified = company.verification_status === "VERIFIED";

  // Filter computations
  const filteredJobs = recentJobs.filter((job) => {
    const matchesSearch =
      !filters.search ||
      job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      job.department.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDept = !filters.department || job.department === filters.department;
    const matchesStatus = !filters.status || job.status === filters.status;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const filteredApplicants = recentApplicants.filter((applicant) => {
    const matchesSearch =
      !filters.search ||
      applicant.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      applicant.jobTitle.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDept =
      !filters.department ||
      applicant.jobTitle.toLowerCase().includes(filters.department.toLowerCase());
    const matchesStatus = !filters.status || applicant.status === filters.status;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const uniqueDepartments = Array.from(new Set(recentJobs.map((j) => j.department)));
  const uniqueStatuses = ["ACTIVE", "DRAFT", "CLOSED", "APPLIED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "HIRED", "REJECTED"];

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 18) return "Good afternoon";
    return "Good evening";
  };
  const firstName = userName ? userName.split(" ")[0] : "Client";

  const locationStr = [company.company_city, company.company_province].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 client-page-transition pb-12">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Hero Executive Header Banner */}
      <div className="relative rounded-2xl border bg-card p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {getGreeting()}, {firstName}
                </h1>
                {isVerified ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified Profile
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Pending Verification
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
                <span className="font-semibold text-foreground">{company.company_name}</span>
                {locationStr && (
                  <>
                    <span>•</span>
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
              className="h-11 bg-[#14a800] hover:bg-[#118f00] disabled:opacity-60 text-white rounded-xl font-semibold px-6 text-sm shadow-sm transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 border-0"
            >
              <Plus className="h-4.5 w-4.5" />
              Post a job
            </Button>
          </div>
        </div>
      </div>

      {/* Conditional Verification Status Banner for Unverified Companies */}
      {!isVerified && (
        <div className="space-y-4">
          {company.verification_status === "PENDING" && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                    Registration Status: Under Admin Review
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-400 max-w-2xl leading-relaxed mt-0.5">
                    Your company verification details have been submitted and are under review. Full hiring features will unlock once approved.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/vos-sync/client/company-profile")}
                className="border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0 text-xs font-semibold"
              >
                View Profile Details
              </Button>
            </div>
          )}

          {/* Onboarding Checklist for non-verified */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Last steps before you can hire
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border bg-card p-5 rounded-2xl flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Required to hire</span>
                    <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                  <h3
                    onClick={() => router.push("/vos-sync/client/company-profile")}
                    className="text-sm font-bold text-foreground hover:underline cursor-pointer"
                  >
                    Submit company profile for verification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Verification officers review company profiles before hiring permissions are unlocked.
                  </p>
                </div>
              </Card>

              <Card className="border bg-card p-5 rounded-2xl flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Required to hire</span>
                    <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-[#14a800] shrink-0" />
                    Email address verified
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Login credentials verified for {company.company_email || "your company account"}.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <KpiCards stats={stats} />

      {/* Main Content: Overview, Filters, & Data Tables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Hiring Overview</h2>
        </div>

        <DashboardFilters
          filters={filters}
          onFilterChange={setFilters}
          departments={uniqueDepartments}
          statuses={uniqueStatuses}
        />

        <Tabs defaultValue="jobs" className="w-full space-y-4">
          <TabsList className="w-fit p-1 bg-muted rounded-xl border">
            <TabsTrigger
              value="jobs"
              className="rounded-lg py-2 px-4 font-semibold text-xs data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              Active Job Posts ({filteredJobs.length})
            </TabsTrigger>
            <TabsTrigger
              value="applicants"
              className="rounded-lg py-2 px-4 font-semibold text-xs data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              Recent Candidates ({filteredApplicants.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="outline-none">
            <RecentJobs jobs={filteredJobs} />
          </TabsContent>

          <TabsContent value="applicants" className="outline-none">
            <RecentApplicants applicants={filteredApplicants} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
