// src/modules/client/dashboard/DashboardModule.tsx
"use client";

import React, { useState, useEffect } from "react";
import KpiCards from "./components/KpiCards";
import RecentJobs from "./components/RecentJobs";
import RecentApplicants from "./components/RecentApplicants";
import DashboardFilters from "./components/DashboardFilters";
import { DashboardData, FilterState } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, LogOut, Building, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardModule() {
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-zinc-500 font-medium animate-pulse text-sm">Synchronizing dashboard workspaces...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Card className="border-rose-100 shadow-md">
          <CardContent className="p-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Sync Failure</h3>
            <p className="text-sm text-zinc-500">{error || "Could not retrieve company profile information."}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { company, stats, recentJobs, recentApplicants } = data;

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

  // Helper for verification status banner
  const renderVerificationBanner = () => {
    switch (company.verification_status) {
      case "PENDING":
        return (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-500/10 dark:bg-amber-950/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-900 dark:text-amber-300">Registration Status: PENDING VERIFICATION</h4>
                <p className="text-sm text-amber-800/80 dark:text-amber-400/80 max-w-2xl leading-relaxed">
                  Your business account registration was submitted successfully. Verification officers are currently reviewing your organization. Job posting and hiring functionalities will unlock once verified.
                </p>
              </div>
            </div>
            <Badge className="w-fit shrink-0 bg-amber-500 text-white border-0 py-1.5 px-3.5 text-xs font-semibold rounded-full shadow-sm">
              In Review
            </Badge>
          </div>
        );
      case "REJECTED":
        return (
          <div className="relative overflow-hidden rounded-2xl border border-rose-200/50 bg-rose-500/10 dark:bg-rose-950/20 p-5 flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-700 dark:text-rose-300 border border-rose-500/20 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-rose-900 dark:text-rose-300">Business Registration Rejected</h4>
              <p className="text-sm text-rose-800/80 dark:text-rose-400/80 max-w-2xl leading-relaxed">
                {company.verification_remarks ||
                  "Unfortunately, your company verification details could not be validated. Please reach out to customer support or verify your billing and business registration certificates."}
              </p>
            </div>
          </div>
        );
      case "SUSPENDED":
        return (
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-zinc-500/10 dark:bg-zinc-950/20 p-5 flex items-start gap-4">
            <div className="p-3 bg-zinc-500/10 rounded-xl text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-300">Account Temporarily Suspended</h4>
              <p className="text-sm text-zinc-800/80 dark:text-zinc-400/80 max-w-2xl leading-relaxed">
                {company.verification_remarks ||
                  "Access to job posting has been temporarily restricted due to policy guidelines. Please coordinate with the governance team."}
              </p>
            </div>
          </div>
        );
      case "VERIFIED":
        return (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-emerald-500/10 dark:bg-emerald-950/20 p-5 flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-300">Verified Business Profile</h4>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-400/80 max-w-2xl leading-relaxed">
                Your company registration is active. You can now post open roles, review matching job seekers, schedule interviews, and issue job offers.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isVerified = company.verification_status === "VERIFIED";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner details */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 text-white p-6 rounded-3xl border shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl text-white border border-white/10 shrink-0">
            <Building className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{company.company_name}</h1>
              {isVerified && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white py-0.5 px-2 rounded-full text-[10px] font-semibold border-0">
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-300 mt-0.5">{company.industry} • {company.company_city}, {company.company_province}</p>
            {/* Profile Completion Progress Bar */}
            {typeof company.profile_completion_percent === "number" && (
              <div className="mt-3 w-48">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-400 font-medium">Profile Completion</span>
                  <span className="text-[10px] text-zinc-300 font-semibold">{company.profile_completion_percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, company.profile_completion_percent)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto shrink-0">
          <Button
            disabled={!isVerified}
            className="flex-1 md:flex-none h-10 bg-primary text-white hover:bg-primary/95 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4.5 w-4.5" />
            Post a Job
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex-1 md:flex-none h-10 border-white/20 text-white bg-transparent hover:bg-white/10 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {renderVerificationBanner()}

      {/* KPI Cards */}
      <KpiCards stats={stats} />

      {/* Filter and listings tab panels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Workspaces Overview</h2>
          <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            Live Filtering
          </div>
        </div>

        <DashboardFilters
          filters={filters}
          onFilterChange={setFilters}
          departments={uniqueDepartments}
          statuses={uniqueStatuses}
        />

        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="w-fit p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border mb-2">
            <TabsTrigger value="jobs" className="rounded-lg py-2 px-4 font-medium text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950">
              Active Job Posts ({filteredJobs.length})
            </TabsTrigger>
            <TabsTrigger value="applicants" className="rounded-lg py-2 px-4 font-medium text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950">
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

