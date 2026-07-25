"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";

interface CompanyVerificationFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
}

export const CompanyVerificationFilters: React.FC<CompanyVerificationFiltersProps> = ({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, TIN, Reg No..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
        <NativeSelect
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full sm:w-60 bg-background text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="IN_REVIEW">Pending: Under Review</option>
          <option value="CORRECTION_REQUIRED">Pending: Correction Required</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DRAFT">Draft</option>
        </NativeSelect>
      </div>
    </div>
  );
};
