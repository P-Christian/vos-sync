/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
// src/modules/client/jobs/JobsModule.tsx
"use client";
import { JobDetailSheet } from "./components/JobDetailSheet";
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useJobs } from "./hooks/useJobs";
import JobList from "./components/JobList";
import JobForm from "./components/JobForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Plus, Search, X, RotateCcw } from "lucide-react";
import CompanyVerificationGuard from "../components/CompanyVerificationGuard";
import { JobPosting, JobFormData, JobStatus, JobType, WorkArrangement, JOB_TYPE_LABELS } from "./types";

import { useRoleCategories } from "./hooks/useRoleCategories";

export default function JobsModule() {
  const searchParams = useSearchParams();
  const targetJobId =
    searchParams.get("jobId") ||
    searchParams.get("job_id") ||
    searchParams.get("selectedJobId") ||
    searchParams.get("id");

  const { categories: roleCategories, findCategoryByName, findCategoryById } = useRoleCategories();
  const {
    jobs,
    loading,
    saving,
    error,
    successMessage,
    filterStatus,
    setFilterStatus,
    fetchJobs,
    createJob,
    updateJob,
    changeJobStatus,
    EMPTY_FORM,
    clearMessages,
  } = useJobs();
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const handleViewJob = (job: JobPosting) => {
    setSelectedJob(job);
    setIsPreviewOpen(true);
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<JobFormData>(EMPTY_FORM);

  // Search & Multi-Filter States (Client-Side)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterJobType, setFilterJobType] = useState<JobType | "ALL">("ALL");
  const [filterWorkArrangement, setFilterWorkArrangement] = useState<WorkArrangement | "ALL">("ALL");

  useEffect(() => {
    fetchJobs(filterStatus);
  }, [fetchJobs, filterStatus]);

  // Auto-open job details sheet if targetJobId is present in URL params
  useEffect(() => {
    if (targetJobId && jobs.length > 0) {
      const match = jobs.find((j) => j.job_id === Number(targetJobId));
      if (match) {
        setSelectedJob(match);
        setIsPreviewOpen(true);
      }
    }
  }, [targetJobId, jobs]);

  const parseJsonField = (value: string | null | undefined): { text: string; extra: Record<string, unknown> } => {
    if (!value) return { text: "", extra: {} };
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return { text: parsed.text ?? "", extra: parsed };
      } catch {
        // ignore
      }
    }
    return { text: value, extra: {} };
  };

  // Dynamic Category Options extracted from vs_role_category & existing jobs
  const categoryOptions = useMemo(() => {
    const categoriesSet = new Set<string>();
    roleCategories.forEach((c) => categoriesSet.add(c.category_name));
    jobs.forEach((job) => {
      const descData = parseJsonField(job.job_description);
      const cat = ((descData.extra?.job_category as string) || job.job_category || "").trim();
      if (cat) categoriesSet.add(cat);
    });
    return [
      { value: "ALL", label: "All Categories" },
      ...Array.from(categoriesSet).map((cat) => ({ value: cat, label: cat })),
    ];
  }, [roleCategories, jobs]);

  // Client-side filtering logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const descData = parseJsonField(job.job_description);
      const category = ((descData.extra?.job_category as string) || job.job_category || "").trim();
      const arrangement = ((descData.extra?.work_arrangement as string) || job.work_arrangement || "Remote").trim();

      // 1. Search Query: matches job_title, job_department, job_location
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (job.job_title ?? "").toLowerCase().includes(q);
        const deptMatch = (job.job_department ?? "").toLowerCase().includes(q);
        const locMatch = (job.job_location ?? "").toLowerCase().includes(q);
        if (!titleMatch && !deptMatch && !locMatch) return false;
      }

      // 2. Category Filter (matches category_id or category name)
      if (filterCategory !== "ALL") {
        const matchedRoleCategory = roleCategories.find(
          (c) => c.category_name.toLowerCase() === filterCategory.toLowerCase()
        );
        const matchesId =
          matchedRoleCategory &&
          job.category_id != null &&
          Number(job.category_id) === matchedRoleCategory.category_id;
        const matchesName = category.toLowerCase() === filterCategory.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }

      // 3. Employment Type Filter
      if (filterJobType !== "ALL") {
        if (job.job_type !== filterJobType) return false;
      }

      // 4. Work Arrangement Filter
      if (filterWorkArrangement !== "ALL") {
        if (arrangement.toLowerCase() !== filterWorkArrangement.toLowerCase()) return false;
      }

      return true;
    });
  }, [jobs, searchQuery, filterCategory, filterJobType, filterWorkArrangement, roleCategories]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    filterCategory !== "ALL" ||
    filterJobType !== "ALL" ||
    filterWorkArrangement !== "ALL" ||
    filterStatus !== "ALL"
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterCategory("ALL");
    setFilterJobType("ALL");
    setFilterWorkArrangement("ALL");
    setFilterStatus("ALL");
  };

  const handleFieldChange = (
    field: keyof JobFormData,
    value: string | number | boolean | null | string[] | { id: number; skill_name: string }[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewJob = () => {
    setEditingJob(null);
    setFormData({
      ...EMPTY_FORM,
      category_id: null,
      job_category: "",
      work_arrangement: "Remote",
      number_of_openings: "1",
      job_responsibilities: "",
      job_qualifications: "",
      skills: [],
      salary_type: "Salary Range",
      currency: "PHP",
      benefits: [],
      education: "",
      screening_questions: [],
    });
    clearMessages();
    setIsDialogOpen(true);
  };

  const handleEditJob = (job: JobPosting) => {
    setEditingJob(job);
    const descData = parseJsonField(job.job_description);
    const reqsData = parseJsonField(job.job_requirements);

    const rawCategory = (descData.extra.job_category as string) || job.job_category || "";
    const rawCategoryId = job.category_id || (descData.extra.category_id as number) || null;
    const resolvedCat = findCategoryById(rawCategoryId) || findCategoryByName(rawCategory);

    // Resolve skills from job.skills (API) with fallback to serialized requirements JSON
    const resolvedSkills = (job.skills && job.skills.length > 0)
      ? job.skills
      : ((reqsData.extra.skills as { id: number; skill_name: string }[]) || []);

    const resolvedBenefits = (job.benefits && job.benefits.length > 0)
      ? job.benefits
      : ((reqsData.extra.benefits as string[]) || []);

    const resolvedEducation = job.education || (reqsData.extra.education as string) || "";

    const resolvedQuestions = (job.screening_questions && job.screening_questions.length > 0)
      ? job.screening_questions
      : ((reqsData.extra.screening_questions as string[]) || []);

    const resolvedDescription = descData.text || job.job_description || "";
    const resolvedResponsibilities =
      (descData.extra.job_responsibilities as string) ||
      (descData.extra.responsibilities as string) ||
      job.job_responsibilities ||
      "";
    const resolvedQualifications =
      (reqsData.extra.job_qualifications as string) ||
      (reqsData.extra.qualifications as string) ||
      job.job_qualifications ||
      reqsData.text ||
      "";

    setFormData({
      job_title: job.job_title ?? "",
      job_description: resolvedDescription,
      job_requirements: reqsData.text || resolvedQualifications,
      job_type: job.job_type ?? "",
      job_location: job.job_location ?? "",
      job_department: job.job_department ?? "",
      salary_min: job.salary_min?.toString() ?? "",
      salary_max: job.salary_max?.toString() ?? "",
      salary_negotiable: job.salary_negotiable ?? false,
      experience_level: job.experience_level ?? "",
      status: job.status ?? "DRAFT",
      // Extra step fields with canonical category resolution
      category_id: resolvedCat?.category_id || rawCategoryId || null,
      job_category: resolvedCat?.category_name || rawCategory,
      work_arrangement: (descData.extra.work_arrangement as string) ?? (job.work_arrangement || "Remote"),
      number_of_openings: (descData.extra.number_of_openings as string) ?? (job.number_of_openings || "1"),
      job_responsibilities: resolvedResponsibilities,
      job_qualifications: resolvedQualifications,
      skills: resolvedSkills,
      salary_type: (reqsData.extra.salary_type as string) ?? (job.salary_type || "Salary Range"),
      currency: (reqsData.extra.currency as string) ?? (job.currency || "PHP"),
      benefits: resolvedBenefits,
      education: resolvedEducation,
      screening_questions: resolvedQuestions,
    });
    clearMessages();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    clearMessages();

    const resolvedCategory = findCategoryByName(formData.job_category) || findCategoryById(formData.category_id);
    const finalCategoryId = formData.category_id || resolvedCategory?.category_id || null;
    const finalCategoryName = resolvedCategory?.category_name || formData.job_category || "";

    // Serialize extra fields into job_description and job_requirements text columns
    const serializedDescription = JSON.stringify({
      text: formData.job_description,
      category_id: finalCategoryId,
      job_category: finalCategoryName,
      work_arrangement: formData.work_arrangement || "Remote",
      number_of_openings: formData.number_of_openings || "1",
      job_responsibilities: formData.job_responsibilities || "",
    });

    const serializedRequirements = JSON.stringify({
      text: formData.job_requirements,
      job_qualifications: formData.job_qualifications || "",
      skills: formData.skills || [],
      salary_type: formData.salary_type || "Salary Range",
      currency: formData.currency || "PHP",
      benefits: formData.benefits || [],
      education: formData.education || "",
      screening_questions: formData.screening_questions || [],
    });

    const payload = {
      ...formData,
      skills: formData.skills || [],
      benefits: formData.benefits || [],
      education: formData.education || "",
      screening_questions: formData.screening_questions || [],
      category_id: finalCategoryId,
      job_category: finalCategoryName,
      job_description: serializedDescription,
      job_requirements: serializedRequirements,
    };

    let ok: boolean;
    if (editingJob) {
      ok = await updateJob(editingJob.job_id, payload);
    } else {
      ok = await createJob(payload);
    }
    if (ok) setIsDialogOpen(false);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    clearMessages();
  };

  const activeCount = jobs.filter((j) => j.status === "ACTIVE").length;
  const draftCount = jobs.filter((j) => j.status === "DRAFT").length;

  return (
    <CompanyVerificationGuard moduleName="Job Postings">
      <div className="space-y-6 client-page-transition">
        <style>{`
          @keyframes page-entry {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .client-page-transition {
            animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Job Postings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeCount} active &bull; {draftCount} draft
            </p>
          </div>
          <Button
            onClick={handleNewJob}
            className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium gap-1.5 w-full sm:w-auto shadow-sm border-0"
          >
            <Plus className="h-4 w-4" />
            New Job Post
          </Button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filter & Job List */}
        <Card className="shadow-sm border border-border/80 bg-card rounded-xl py-0 gap-0 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 space-y-3">
            {/* 2-Column Balanced Toolbar: Left (Search Bar), Right (4 Equal Filter Dropdowns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              {/* Col 1: Search Bar (5 cols) */}
              <div className="relative lg:col-span-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by job title, department, or location..."
                  className="pl-9 pr-9 h-9 text-xs sm:text-sm bg-background border-border/80 rounded-lg focus-visible:ring-primary/20 w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Col 2: 4 Equally Spaced Filter Dropdowns (7 cols) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:col-span-7">
                {/* Category (Searchable Combobox) */}
                <div className="w-full">
                  <SearchableSelect
                    options={categoryOptions}
                    value={filterCategory}
                    onValueChange={(v) => setFilterCategory(v)}
                    placeholder="All Categories"
                    className="h-9 text-xs rounded-lg border-border/80 bg-background font-medium w-full"
                  />
                </div>

                {/* Employment Type */}
                <div className="w-full">
                  <Select
                    value={filterJobType}
                    onValueChange={(v) => setFilterJobType(v as JobType | "ALL")}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium rounded-lg border-border/80 bg-background w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs font-medium">All Types</SelectItem>
                      <SelectItem value="FULL_TIME" className="text-xs font-medium">Full-Time</SelectItem>
                      <SelectItem value="PART_TIME" className="text-xs font-medium">Part-Time</SelectItem>
                      <SelectItem value="CONTRACT" className="text-xs font-medium">Contract</SelectItem>
                      <SelectItem value="INTERNSHIP" className="text-xs font-medium">Internship</SelectItem>
                      <SelectItem value="FREELANCE" className="text-xs font-medium">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Work Arrangement */}
                <div className="w-full">
                  <Select
                    value={filterWorkArrangement}
                    onValueChange={(v) => setFilterWorkArrangement(v as WorkArrangement | "ALL")}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium rounded-lg border-border/80 bg-background w-full">
                      <SelectValue placeholder="All Setups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs font-medium">All Setups</SelectItem>
                      <SelectItem value="Remote" className="text-xs font-medium">Remote</SelectItem>
                      <SelectItem value="Hybrid" className="text-xs font-medium">Hybrid</SelectItem>
                      <SelectItem value="On-site" className="text-xs font-medium">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="w-full">
                  <Select
                    value={filterStatus}
                    onValueChange={(v) => setFilterStatus(v as JobStatus | "ALL")}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium rounded-lg border-border/80 bg-background w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs font-medium">All Status</SelectItem>
                      <SelectItem value="ACTIVE" className="text-xs font-medium text-primary">Active</SelectItem>
                      <SelectItem value="DRAFT" className="text-xs font-medium text-amber-600">Draft</SelectItem>
                      <SelectItem value="CLOSED" className="text-xs font-medium text-rose-600">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Active Filters Bar / Results Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">
                  Showing {filteredJobs.length} {filteredJobs.length === 1 ? "posting" : "postings"}
                  {jobs.length !== filteredJobs.length && (
                    <span className="text-muted-foreground font-normal"> (filtered from {jobs.length})</span>
                  )}
                </span>

                {/* Active Filter Chips */}
                {searchQuery.trim() && (
                  <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-2 bg-muted rounded-md font-normal">
                    Search: &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery("")} className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterCategory !== "ALL" && (
                  <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-2 bg-muted rounded-md font-normal">
                    Category: {filterCategory}
                    <button onClick={() => setFilterCategory("ALL")} className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterJobType !== "ALL" && (
                  <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-2 bg-muted rounded-md font-normal">
                    Type: {JOB_TYPE_LABELS[filterJobType]}
                    <button onClick={() => setFilterJobType("ALL")} className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterWorkArrangement !== "ALL" && (
                  <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-2 bg-muted rounded-md font-normal">
                    Arrangement: {filterWorkArrangement}
                    <button onClick={() => setFilterWorkArrangement("ALL")} className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterStatus !== "ALL" && (
                  <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-2 bg-muted rounded-md font-normal">
                    Status: {filterStatus}
                    <button onClick={() => setFilterStatus("ALL")} className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 -mr-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset all
                </Button>
              )}
            </div>
          </div>

          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground animate-pulse">Loading job postings...</span>
              </div>
            ) : (
              <>
                <JobList
                  jobs={filteredJobs}
                  totalJobsCount={jobs.length}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetFilters}
                  onView={handleViewJob}
                  onEdit={handleEditJob}
                  onStatusChange={changeJobStatus}
                />
                <JobDetailSheet
                  job={selectedJob ? (() => {
                    const descData = parseJsonField(selectedJob.job_description);
                    const reqsData = parseJsonField(selectedJob.job_requirements);
                    return {
                      ...selectedJob,
                      job_category: (selectedJob.job_category || (descData.extra.job_category as string) || ""),
                      work_arrangement: ((selectedJob.work_arrangement || (descData.extra.work_arrangement as string) || "Remote") as WorkArrangement),
                      job_description: descData.text || selectedJob.job_description || "",
                      job_responsibilities: (selectedJob.job_responsibilities || (descData.extra.job_responsibilities as string) || ""),
                      job_requirements: reqsData.text || selectedJob.job_requirements || "",
                      job_qualifications: (selectedJob.job_qualifications || (reqsData.extra.job_qualifications as string) || ""),
                      number_of_openings: (selectedJob.number_of_openings || (descData.extra.number_of_openings as string) || "1"),
                      skills: (selectedJob.skills || (reqsData.extra.skills as any) || []),
                      benefits: (selectedJob.benefits || (reqsData.extra.benefits as string[]) || []),
                      education: (selectedJob.education || (reqsData.extra.education as string) || ""),
                      screening_questions: (selectedJob.screening_questions || (reqsData.extra.screening_questions as string[]) || []),
                      salary_type: (selectedJob.salary_type || (reqsData.extra.salary_type as string) || "Salary Range") as any,
                      salary_negotiable: selectedJob.salary_negotiable ?? false,
                      currency: selectedJob.currency ?? "PHP",
                    } as any;
                  })() : null}
                  open={isPreviewOpen}
                  onClose={() => {
                    setIsPreviewOpen(false);
                    setSelectedJob(null);
                  }}
                  onEdit={handleEditJob}
                  onStatusChange={async (jobId, newStatus) => {
                    await changeJobStatus(jobId, newStatus);
                    setSelectedJob((prev) => prev ? { ...prev, status: newStatus } : null);
                  }}
                  onApply={() => { }}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-5xl w-full h-[85vh] max-h-[85vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="pb-2 border-b border-border/80">
              <DialogTitle className="text-base font-bold">
                {editingJob ? "Edit Job Posting" : "Create New Job Posting"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Fill out the details of the job posting below.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
            <JobForm
              data={formData}
              onChange={handleFieldChange}
              onCancel={handleClose}
              onSubmit={handleSave}
              saving={saving}
              editingJob={!!editingJob}
            />
          </DialogContent>
        </Dialog>
      </div>
    </CompanyVerificationGuard>
  );
}


