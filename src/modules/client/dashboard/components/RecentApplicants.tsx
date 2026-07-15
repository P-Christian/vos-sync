// src/modules/client/dashboard/components/RecentApplicants.tsx
import React from "react";
import { Applicant } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface RecentApplicantsProps {
  applicants: Applicant[];
}

export default function RecentApplicants({ applicants }: RecentApplicantsProps) {
  const getStatusBadge = (status: Applicant["status"]) => {
    switch (status) {
      case "SHORTLISTED":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300">
            Shortlisted
          </Badge>
        );
      case "INTERVIEW_SCHEDULED":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300">
            Interview Scheduled
          </Badge>
        );
      case "APPLIED":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300">
            Applied
          </Badge>
        );
      case "HIRED":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300">
            Hired
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400">
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (applicants.length === 0) {
    return (
      <div className="text-center py-10 border rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
        <p className="text-sm text-muted-foreground">No applicants found at this time.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-lg rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Applicant</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Target Position</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Experience</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Applied Date</TableHead>
            <TableHead className="font-semibold text-zinc-900 dark:text-zinc-50">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applicants.map((applicant) => (
            <TableRow key={applicant.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
              <TableCell className="py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border shrink-0">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{applicant.name}</div>
                    <div className="text-xs text-zinc-500">{applicant.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                {applicant.jobTitle}
              </TableCell>
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                {applicant.experience}
              </TableCell>
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  {formatDateTime(new Date(applicant.appliedDate))}
                </div>
              </TableCell>
              <TableCell className="py-4">{getStatusBadge(applicant.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

