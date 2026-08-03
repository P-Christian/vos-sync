"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, MapPin, Clock, DollarSign } from "lucide-react";
import { CompanyJob, PublicCompanyProfile } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface JobsTabProps {
  company: PublicCompanyProfile;
  onArrangementsChange?: (arrangements: string[]) => void;
}

export function JobsTab({ company, onArrangementsChange }: JobsTabProps) {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("ALL");
  const [arrangement, setArrangement] = useState("ALL");
  const [experience, setExperience] = useState("ALL");
  const [page, setPage] = useState(1);

  const limit = 5;
  const totalPages = Math.ceil(total / limit);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (jobType !== "ALL") params.append("job_type", jobType);
      if (arrangement !== "ALL") params.append("work_arrangement", arrangement);
      if (experience !== "ALL") params.append("experience_level", experience);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await fetch(`/api/public/companies/${company.company_code}/jobs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.jobs || []);
        setTotal(json.total || 0);

        // Bubble up work arrangements if needed for hiring status
        if (json.jobs && json.jobs.length > 0 && onArrangementsChange) {
          const uniqueArrangements = Array.from(new Set(json.jobs.map((j: CompanyJob) => j.work_arrangement))) as string[];
          onArrangementsChange(uniqueArrangements);
        }
      }
    } catch (e) {
      console.error("Failed to load jobs for company:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobType, arrangement, experience, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadJobs();
  };

  const handleResetFilters = () => {
    setSearch("");
    setJobType("ALL");
    setArrangement("ALL");
    setExperience("ALL");
    setPage(1);
  };

  const formatJobType = (type: string) => {
    return type.replace("_", " ");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Search and Filters box */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Text search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {/* Job Type Select */}
          <div className="md:col-span-3">
            <select
              value={jobType}
              onChange={(e) => {
                setJobType(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="ALL">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="FREELANCE">Freelance</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          {/* Work Arrangement */}
          <div className="md:col-span-3">
            <select
              value={arrangement}
              onChange={(e) => {
                setArrangement(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="ALL">All Setup</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          {/* Trigger button */}
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" className="flex-1 h-10 rounded-xl font-semibold cursor-pointer">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              className="h-10 px-3 rounded-xl border-input hover:bg-muted"
              title="Reset Filters"
            >
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* Jobs results list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm font-semibold text-muted-foreground">Retrieving open positions...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="border border-dashed rounded-3xl py-16 px-4 bg-muted/10 text-center">
            <h3 className="text-lg font-bold text-foreground mb-1">No open jobs found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              There are currently no active job postings matching your filter selections.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-card border border-border p-6 rounded-2xl hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                        {job.title}
                      </h3>
                      {job.department && (
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mt-1">
                          {job.department}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Badge variant="outline" className="rounded-xl px-2.5 py-0.5 font-semibold text-xs bg-muted/30">
                        {formatJobType(job.type)}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold px-2.5 py-0.5 rounded-xl text-xs border-none">
                        {job.work_arrangement}
                      </Badge>
                    </div>
                  </div>

                  {/* Skills/Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-2 py-0.5 text-[10px] font-semibold rounded-md">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Footer details row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-sm text-muted-foreground mt-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-foreground font-semibold">
                        <DollarSign className="w-4 h-4 shrink-0 text-muted-foreground" />
                        {job.salary}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {job.posted}
                      </span>
                      <Button size="sm" variant="outline" className="rounded-xl font-semibold cursor-pointer shadow-sm" asChild>
                        <Link href="/find-jobs">View Details</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="rounded-xl font-medium cursor-pointer"
                >
                  Previous
                </Button>
                <span className="text-sm font-semibold text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="rounded-xl font-medium cursor-pointer"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
