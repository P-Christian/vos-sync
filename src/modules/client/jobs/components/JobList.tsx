// src/modules/client/jobs/components/JobList.tsx
"use client";

import React from "react";
import { JobPosting, JobStatus } from "../types";
import JobCard from "./JobCard";
import { Briefcase } from "lucide-react";

interface JobListProps {
  jobs: JobPosting[];
  onEdit: (job: JobPosting) => void;
  onStatusChange: (jobId: number, newStatus: JobStatus) => void;
}

export default function JobList({ jobs, onEdit, onStatusChange }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4">
          <Briefcase className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
          No job postings yet
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Create your first job posting to start attracting top talent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.job_id} job={job} onEdit={onEdit} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
