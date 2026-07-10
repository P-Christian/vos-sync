// src/modules/client/jobs/JobsModule.tsx
"use client";

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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Plus, Briefcase } from "lucide-react";
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
    closeJob,
    EMPTY_FORM,
    clearMessages,
  } = useJobs();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<JobFormData>(EMPTY_FORM);

  useEffect(() => {
    fetchJobs(filterStatus);
  }, [fetchJobs, filterStatus]);

  const handleFieldChange = (field: keyof JobFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewJob = () => {
    setEditingJob(null);
    setFormData(EMPTY_FORM);
    clearMessages();
    setIsDialogOpen(true);
  };

  const handleEditJob = (job: JobPosting) => {
    setEditingJob(job);
    setFormData({
      job_title: job.job_title ?? "",
      job_description: job.job_description ?? "",
      job_requirements: job.job_requirements ?? "",
      job_type: job.job_type ?? "",
      job_location: job.job_location ?? "",
      job_department: job.job_department ?? "",
      salary_min: job.salary_min?.toString() ?? "",
      salary_max: job.salary_max?.toString() ?? "",
      salary_negotiable: job.salary_negotiable ?? false,
      experience_level: job.experience_level ?? "",
      status: job.status ?? "ACTIVE",
    });
    clearMessages();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    clearMessages();
    let ok: boolean;
    if (editingJob) {
      ok = await updateJob(editingJob.job_id, formData);
    } else {
      ok = await createJob(formData);
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 text-white p-6 rounded-3xl border shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/10">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Job Postings</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {activeCount} active &bull; {draftCount} draft
            </p>
          </div>
        </div>
        <Button
          onClick={handleNewJob}
          className="relative z-10 h-10 bg-primary hover:bg-primary/90 rounded-xl text-sm font-medium gap-1.5 w-full sm:w-auto"
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
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
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
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-zinc-400 animate-pulse">Loading job postings...</span>
            </div>
          ) : (
            <JobList jobs={jobs} onEdit={handleEditJob} onClose={closeJob} />
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingJob ? "Edit Job Posting" : "Create New Job Posting"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <JobForm data={formData} onChange={handleFieldChange} />

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose} disabled={saving} className="h-9 text-sm rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-9 text-sm rounded-lg gap-1.5">
              {saving ? "Saving..." : editingJob ? "Save Changes" : "Create Posting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

