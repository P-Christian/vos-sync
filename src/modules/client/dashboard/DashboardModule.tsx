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
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, LogOut, Building, Plus, Phone, ShieldCheck, Mail, CheckCircle, Circle } from "lucide-react";
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

  if (data.onboardingRequired) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-zinc-50/50 to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 rounded-3xl overflow-hidden relative">
          <div className="absolute right-0 top-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-8 sm:p-10 space-y-6 relative z-10">
            <div className="flex items-center gap-4">

              <div>

                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  Welcome to VOS Sync
                </h2>
              </div>
            </div>

            <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
              Complete your company profile to unlock dashboard insights, manage job postings, and connect with top talent.
            </p>

            <div className="space-y-3 bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Setup Checklist
              </h4>
              <ul className="space-y-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <li className="flex items-center gap-2.5">
                  <Circle className="h-4 w-4 text-zinc-400 shrink-0" />
                  Verify your company details
                </li>

                <li className="flex items-center gap-2.5">
                  <Circle className="h-4 w-4 text-zinc-400 shrink-0" />
                  Complete your organization profile
                </li>

                <li className="flex items-center gap-2.5">
                  <Circle className="h-4 w-4 text-zinc-400 shrink-0" />
                  Post your first job
                </li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={() => router.push("/vos-sync/client/company-profile")}
                className="w-full sm:w-auto h-11 px-8 text-sm font-semibold rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 shadow-md transition-all duration-300 transform active:scale-95"
              >
                Complete Profile
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 text-sm font-medium rounded-xl border-zinc-200 dark:border-zinc-800"
              >
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = data.company ?? ({} as CompanyInfo);
  const stats = data.stats ?? { activeJobs: 0, hiredCount: 0, pendingInterviews: 0, totalApplicants: 0, totalJobs: 0 };
  const recentJobs = data.recentJobs ?? [];
  const recentApplicants = data.recentApplicants ?? [];

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

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 18) return "Good afternoon";
    return "Good evening";
  };
  const firstName = userName ? userName.split(" ")[0] : "Client";

  const isVerified = company.verification_status === "VERIFIED";

  return (
    <div className="space-y-8 client-page-transition pb-12">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* Dynamic Upwork Greeting Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {getGreeting()}, {firstName}
        </h1>
        <Button
          onClick={() => router.push("/vos-sync/client/jobs")}
          disabled={!isVerified}
          className="h-10 bg-[#14a800] hover:bg-[#118f00] disabled:opacity-60 text-white rounded-full font-medium px-6 text-sm shadow-md transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5 border-0"
        >
          <Plus className="h-4.5 w-4.5" />
          Post a job
        </Button>
      </div>

      {/* Upwork Onboarding Task Checklist ("Last steps before you can hire") */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
          Last steps before you can hire
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Phone Verification
          <Card className="border bg-card p-5 rounded-xl flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Required to publish a job</span>
                <Phone className="h-5 w-5 text-zinc-400 shrink-0" />
              </div>
              {company.company_contact ? (
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-[#14a800] shrink-0" />
                  Phone number verified
                </h3>
              ) : (
                <h3
                  onClick={() => router.push("/vos-sync/client/company-profile")}
                  className="text-base font-bold text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer decoration-2"
                >
                  Verify your phone number
                </h3>
              )}
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {company.company_contact
                  ? `Successfully verified phone: ${company.company_contact}`
                  : "Confirm it's you, to be able to publish your first job post."}
              </p>
            </div>
          </Card> */}

          {/* Card 2: Company verification */}
          <Card className="border bg-card p-5 rounded-xl flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Required to hire</span>
                <ShieldCheck className="h-5 w-5 text-zinc-400 shrink-0" />
              </div>
              {isVerified ? (
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-[#14a800] shrink-0" />
                  Company profile verified
                </h3>
              ) : (
                <h3
                  onClick={() => router.push("/vos-sync/client/company-profile")}
                  className="text-base font-bold text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer decoration-2"
                >
                  Submit company profile for review
                </h3>
              )}
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                {isVerified
                  ? "Your organization is verified. All hiring capabilities are unlocked."
                  : "Verification officers are currently reviewing your company profile. Keep it completed."}
              </p>
            </div>
          </Card>

          {/* Card 3: Email Verification */}
          <Card className="border bg-card p-5 rounded-xl flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Required to hire</span>
                <Mail className="h-5 w-5 text-zinc-400 shrink-0" />
              </div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-[#14a800] shrink-0" />
                Email address verified
              </h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Successfully verified login credentials for {company.company_email || "your company"}.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Top organization details card (plain style) */}
      <Card className="shadow-sm border bg-card rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 sm:p-8 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 shrink-0">
              <Building className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{company.company_name}</h2>
                {isVerified && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 py-0.5 px-2 rounded-full text-[10px] font-semibold">
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{company.industry} &bull; {company.company_city}, {company.company_province}</p>
              {/* Profile Completion Progress Bar */}
              {typeof company.profile_completion_percent === "number" && (
                <div className="mt-3.5 w-48">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium">Profile Completion</span>
                    <span className="text-[10px] text-foreground font-semibold">{company.profile_completion_percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, company.profile_completion_percent)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Button
              onClick={() => router.push("/vos-sync/client/jobs")}
              disabled={!isVerified}
              className="flex-grow md:flex-none h-10 bg-[#14a800] hover:bg-[#118f00] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border-0 shadow-sm"
            >
              <Plus className="h-4.5 w-4.5" />
              Post a Job
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-grow md:flex-none h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </Card>

      {renderVerificationBanner()}

      {/* KPI Cards */}
      <KpiCards stats={stats} />

      {/* Filter and listings tab panels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Overview</h2>

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

