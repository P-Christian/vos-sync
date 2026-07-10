// src/modules/client/dashboard/components/RecentJobs.tsx
import React from "react";
import { JobPosting } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface RecentJobsProps {
  jobs: JobPosting[];
}

export default function RecentJobs({ jobs }: RecentJobsProps) {
  const getStatusBadge = (status: JobPosting["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300">
            Active
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400">
            Draft
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400">
            Closed
          </Badge>
        );
      default:
        return null;
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-10 border rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
        <p className="text-sm text-muted-foreground">No job postings found. Create your first job posting!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-xl bg-white dark:bg-zinc-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Job Title</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Department</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Location</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50 text-center">Applicants</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Posted Date</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
              <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100 py-4">
                {job.title}
              </TableCell>
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">{job.department}</TableCell>
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {job.location}
                </div>
              </TableCell>
              <TableCell className="text-sm text-center">
                <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-full text-zinc-700 dark:text-zinc-300 font-medium">
                  <Users className="h-3.5 w-3.5 text-zinc-400" />
                  {job.applicantsCount}
                </div>
              </TableCell>
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  {formatDateTime(new Date(job.postedAt))}
                </div>
              </TableCell>
              <TableCell className="py-4">{getStatusBadge(job.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

