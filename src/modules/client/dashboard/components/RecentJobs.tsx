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
import { MapPin, Calendar, Users, FolderClosed, Search, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface RecentJobsProps {
  jobs: JobPosting[];
}

export default function RecentJobs({ jobs }: RecentJobsProps) {
  const router = useRouter();

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
      <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-lg rounded-3xl min-h-[300px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 mb-4">
          <FolderClosed className="h-8 w-8" />
        </div>
        <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200 mb-6">
          No job posts or contracts in progress right now
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => router.push("/vos-sync/client/applicants")}
            variant="outline"
            className="rounded-full border-zinc-300 text-zinc-700 dark:text-zinc-300 px-6 h-10 w-full sm:w-auto text-sm font-semibold"
          >
            <Search className="h-4 w-4 mr-1.5" />
            Find a talent
          </Button>
          <Button
            onClick={() => router.push("/vos-sync/client/jobs")}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-10 w-full sm:w-auto text-sm font-semibold border-0 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Post a job
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-lg rounded-xl">
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

