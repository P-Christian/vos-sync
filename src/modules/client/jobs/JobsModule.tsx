/* eslint-disable @typescript-eslint/no-explicit-any */
// src/modules/client/jobs/JobsModule.tsx
"use client";
import { JobDetailSheet } from "./components/JobDetailSheet";
import React, { useEffect, useState } from "react";
import { useJobs } from "./hooks/useJobs";
import JobList from "./components/JobList";
import JobForm from "./components/JobForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, CheckCircle, Plus } from "lucide-react";
import { JobPosting, JobFormData, JobStatus } from "./types";

export default function JobsModule() {
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

  useEffect(() => {
    fetchJobs(filterStatus);
  }, [fetchJobs, filterStatus]);

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

  const handleFieldChange = (
    field: keyof JobFormData,
    value: string | boolean | string[] | { id: number; skill_name: string }[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewJob = () => {
    setEditingJob(null);
    setFormData({
      ...EMPTY_FORM,
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

    setFormData({
      job_title: job.job_title ?? "",
      job_description: descData.text,
      job_requirements: reqsData.text,
      job_type: job.job_type ?? "",
      job_location: job.job_location ?? "",
      job_department: job.job_department ?? "",
      salary_min: job.salary_min?.toString() ?? "",
      salary_max: job.salary_max?.toString() ?? "",
      salary_negotiable: job.salary_negotiable ?? false,
      experience_level: job.experience_level ?? "",
      status: job.status ?? "DRAFT",
      // Extra step fields
      job_category: (descData.extra.job_category as string) ?? "",
      work_arrangement: (descData.extra.work_arrangement as string) ?? "Remote",
      number_of_openings: (descData.extra.number_of_openings as string) ?? "1",
      job_responsibilities: (descData.extra.job_responsibilities as string) ?? "",
      job_qualifications: (reqsData.extra.job_qualifications as string) ?? "",
      skills: (reqsData.extra.skills as { id: number; skill_name: string }[]) ?? [],
      salary_type: (reqsData.extra.salary_type as string) ?? "Salary Range",
      currency: (reqsData.extra.currency as string) ?? "PHP",
      benefits: (reqsData.extra.benefits as string[]) ?? [],
      education: (reqsData.extra.education as string) ?? "",
      screening_questions: (reqsData.extra.screening_questions as string[]) ?? [],

    });
    clearMessages();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    clearMessages();

    // Serialize extra fields into job_description and job_requirements text columns
    const serializedDescription = JSON.stringify({
      text: formData.job_description,
      job_category: formData.job_category || "",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Postings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active &bull; {draftCount} draft
          </p>
        </div>
        <Button
          onClick={handleNewJob}
          className="h-10 bg-[#14a800] hover:bg-[#118f00] text-white rounded-xl text-sm font-medium gap-1.5 w-full sm:w-auto shadow-sm border-0"
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
      <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between p-6  border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
          <CardTitle className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            All Postings
          </CardTitle>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as JobStatus | "ALL")}
          >
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">All Status</SelectItem>
              <SelectItem value="ACTIVE" className="text-sm">Active</SelectItem>
              <SelectItem value="DRAFT" className="text-sm">Draft</SelectItem>
              <SelectItem value="CLOSED" className="text-sm">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-zinc-400 animate-pulse">Loading job postings...</span>
            </div>
          ) : (
            <>
              <JobList
                jobs={jobs}
                onView={handleViewJob}
                onEdit={handleEditJob}
                onStatusChange={changeJobStatus}
              />
              <JobDetailSheet
                job={selectedJob as any}
                open={isPreviewOpen}
                onClose={() => {
                  setIsPreviewOpen(false);
                  setSelectedJob(null);
                }}
                onApply={() => { }}
              />
              {/* <JobForm
                data={formData}
                onChange={handleFieldChange}
                onCancel={handleClose}
                onSubmit={handleSave}
                saving={saving}
                editingJob={!!editingJob}
              /> */}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-5xl w-full h-[85vh] max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
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
  );
}

