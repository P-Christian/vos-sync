// src/modules/client/applicants/components/ApplicantFilters.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { ApplicationStatus, STATUS_LABELS } from "../types";

interface ApplicantFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: ApplicationStatus | "ALL";
  onStatusChange: (v: ApplicationStatus | "ALL") => void;
}

export default function ApplicantFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: ApplicantFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
        <Input
          id="applicant-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, or job title..."
          className="h-9 pl-8 text-sm"
        />
      </div>
      <Select
        value={status}
        onValueChange={(v) => onStatusChange(v as ApplicationStatus | "ALL")}
      >
        <SelectTrigger className="h-9 w-48 text-sm rounded-lg shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="text-sm">All Statuses</SelectItem>
          {(Object.entries(STATUS_LABELS) as [ApplicationStatus, string][]).map(
            ([k, v]) => (
              <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

