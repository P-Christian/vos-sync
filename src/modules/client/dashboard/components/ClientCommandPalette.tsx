"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  Calendar,
  FileText,
  PlusCircle,
  Clock,
  LayoutDashboard,
  Building,
  Settings,
  Search,

  Loader2,
  ArrowRight,
} from "lucide-react";

interface ClientCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}

interface SearchJob {
  job_id: number;
  job_title: string;
  job_status?: string;
  department_name?: string;
  work_setup?: string;
  employment_type?: string;
}

interface SearchApplicant {
  application_id: number;
  applicant_name: string;
  applicant_email: string;
  job_title: string;
  application_status: string;
  stage_name?: string;
  user_id?: number;
}

interface TalentUser {
  user_id: number;
  name: string;
  headline?: string;
  avatar_url?: string;
  badge_label?: string;
  entity_type?: string;
}

const RECENT_SEARCHES_KEY = "vos_client_recent_searches";

export function ClientCommandPalette({ open, onOpenChange, initialQuery }: ClientCommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery || "");
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);

  if (open !== prevOpen || initialQuery !== prevInitialQuery) {
    setPrevOpen(open);
    setPrevInitialQuery(initialQuery);
    if (open && initialQuery !== undefined) {
      setSearchQuery(initialQuery);
    }
  }

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Live data states
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [applicants, setApplicants] = useState<SearchApplicant[]>([]);
  const [talentResults, setTalentResults] = useState<TalentUser[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Load recent searches on mount / open
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored).slice(0, 5));
        }
      } catch {
        setRecentSearches([]);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [open]);

  // Fetch employer's live jobs & applicants when the palette opens
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setIsLoadingData(true);
    }, 0);

    Promise.allSettled([
      fetch("/api/client/jobs").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/client/applicants").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([jobsRes, appRes]) => {
        if (!isMounted) return;
        if (jobsRes.status === "fulfilled" && jobsRes.value?.jobs) {
          setJobs(jobsRes.value.jobs);
        }
        if (appRes.status === "fulfilled" && appRes.value?.applicants) {
          setApplicants(appRes.value.applicants);
        }
        setIsLoadingData(false);
      })
      .catch(() => {
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open]);

  // Query talent pool if search term is typed
  useEffect(() => {
    if (!open || searchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shared/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          // Filter out self or limit to top 4 results
          setTalentResults((json || []).slice(0, 4));
        }
      } catch {
        // Ignore fetch errors
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [open, searchQuery]);

  const effectiveTalentResults = searchQuery.trim().length < 2 ? [] : talentResults;

  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];
      const updated = [term, ...list.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSelect = useCallback(
    (url: string, term?: string) => {
      if (term) saveRecentSearch(term);
      onOpenChange(false);
      router.push(url);
    },
    [onOpenChange, router, saveRecentSearch]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Client Command Palette"
      description="Quickly navigate, search candidates, jobs, and run actions"
    >
      <CommandInput
        placeholder="Type a candidate name, job title, or command..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty>
          {isLoadingData ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading hiring records...</span>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No matching candidates, jobs, or pages found.
            </div>
          )}
        </CommandEmpty>

        {/* Quick Actions (Always accessible) */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            value="Post a job create new listing hiring"
            onSelect={() => handleSelect("/vos-sync/client/jobs", "Post a job")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Post a job</span>
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">Create new listing</span>
          </CommandItem>
          <CommandItem
            value="Schedule interview book candidate session"
            onSelect={() => handleSelect("/vos-sync/client/interviews", "Schedule interview")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-foreground">Schedule interview</span>
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">Book candidate session</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Searches (When input is empty) */}
        {!searchQuery.trim() && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((term) => (
                <CommandItem
                  key={term}
                  value={`recent ${term}`}
                  onSelect={() => {
                    setSearchQuery(term);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{term}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Live Jobs Section */}
        <CommandGroup heading="Jobs & Listings">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <CommandItem
                key={`job-${job.job_id}`}
                value={`job ${job.job_title} ${job.department_name || ""} ${job.work_setup || ""} ${job.employment_type || ""} ${job.job_status || ""}`}
                onSelect={() => handleSelect(`/vos-sync/client/jobs?jobId=${job.job_id}`, job.job_title)}
                className="flex items-center gap-3 cursor-pointer py-2 px-3"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-sm text-foreground truncate">{job.job_title}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {[job.department_name, job.work_setup, job.employment_type].filter(Boolean).join(" • ") || "Job Posting"}
                  </span>
                </div>
                {job.job_status && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 font-medium ${
                      job.job_status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {job.job_status}
                  </Badge>
                )}
              </CommandItem>
            ))
          ) : (
            <CommandItem
              value="View All Jobs and Listings"
              onSelect={() => handleSelect("/vos-sync/client/jobs", "All Jobs")}
              className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground"
            >
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>All Jobs & Listings</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Live Candidates & Applicants Section */}
        <CommandGroup heading="Candidates & Applicants">
          {applicants.length > 0 &&
            applicants.map((app) => (
              <CommandItem
                key={`applicant-${app.application_id}`}
                value={`applicant candidate ${app.applicant_name} ${app.job_title} ${app.stage_name || app.application_status}`}
                onSelect={() => handleSelect(`/vos-sync/client/applicants?search=${encodeURIComponent(app.applicant_name)}`, app.applicant_name)}
                className="flex items-center gap-3 cursor-pointer py-2 px-3"
              >
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  {app.applicant_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-sm text-foreground truncate">{app.applicant_name}</span>
                  <span className="text-xs text-muted-foreground truncate">Role: {app.job_title}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] shrink-0 font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {app.stage_name || app.application_status}
                </Badge>
              </CommandItem>
            ))}

          {/* Additional Talent Search matches */}
          {effectiveTalentResults.length > 0 &&
            effectiveTalentResults.map((talent) => (
              <CommandItem
                key={`talent-${talent.user_id}`}
                value={`talent candidate ${talent.name} ${talent.headline || ""}`}
                onSelect={() => handleSelect(`/vos-sync/public/freelancer/${talent.user_id}?portal=client`, talent.name)}
                className="flex items-center gap-3 cursor-pointer py-2 px-3"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  {talent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-sm text-foreground truncate">{talent.name}</span>
                  {talent.headline && (
                    <span className="text-xs text-muted-foreground truncate">{talent.headline}</span>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                  {talent.badge_label || "Talent Pool"}
                </Badge>
              </CommandItem>
            ))}

          {/* Fallback navigation shortcuts when list is empty or general browsing */}
          <CommandItem
            value="Review All Applicants pipeline"
            onSelect={() => handleSelect("/vos-sync/client/applicants", "Review All Applicants")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-amber-500" />
            <span>Review All Applicants</span>
            <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
          </CommandItem>
          <CommandItem
            value="Shortlisted Candidates filter"
            onSelect={() => handleSelect("/vos-sync/client/applicants?status=SHORTLISTED", "Shortlisted Candidates")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Users className="h-4 w-4 text-emerald-500" />
            <span>Shortlisted Candidates</span>
            <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
          </CommandItem>
          <CommandItem
            value="Talent Search Directory search"
            onSelect={() => handleSelect("/vos-sync/client/talent-search", "Talent Search Directory")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Search className="h-4 w-4 text-indigo-500" />
            <span>Talent Search Directory</span>
            <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Pages Group */}
        <CommandGroup heading="Client Portal Pages">
          <CommandItem
            value="Dashboard page G D"
            onSelect={() => handleSelect("/vos-sync/client/dashboard", "Dashboard")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <span>Dashboard</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">G then D</span>
          </CommandItem>
          <CommandItem
            value="Manage Jobs page G J"
            onSelect={() => handleSelect("/vos-sync/client/jobs", "Manage Jobs")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-blue-500" />
            <span>Manage Jobs</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">G then J</span>
          </CommandItem>
          <CommandItem
            value="Company Profile settings"
            onSelect={() => handleSelect("/vos-sync/client/company-profile", "Company Profile")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>Company Profile</span>
          </CommandItem>
          <CommandItem
            value="Interview Calendar schedule"
            onSelect={() => handleSelect("/vos-sync/client/interviews", "Interview Calendar")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Interview Calendar</span>
          </CommandItem>
          <CommandItem
            value="Configuration Team settings"
            onSelect={() => handleSelect("/vos-sync/client/settings", "Configuration & Team")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Configuration & Team</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

