"use client";

import React from 'react';
import { Filter } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ApplicationStatus } from '../types';

export const APPLICATION_STATUS_FILTERS: Array<{ value: ApplicationStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All Statuses" },
  { value: "APPLIED", label: "Applied" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

interface Props {
  totalOpportunities: number;
  filterStatus: ApplicationStatus | "ALL";
  onFilterChange: (status: ApplicationStatus | "ALL") => void;
}

export const ApplicationHeader: React.FC<Props> = ({ 
  totalOpportunities, 
  filterStatus, 
  onFilterChange 
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Application History</h2>
        <p className="text-muted-foreground text-sm md:text-xs">
          Track your journey across {totalOpportunities} active opportunit{totalOpportunities === 1 ? 'y' : 'ies'}.
        </p>
      </div>
      <div className="flex gap-2 items-center max-md:hidden min-w-[180px]">
        <SearchableSelect
          options={APPLICATION_STATUS_FILTERS}
          value={filterStatus}
          onValueChange={(val) => onFilterChange(val as ApplicationStatus | "ALL")}
          placeholder="Filter by status"
          className="w-[180px] max-md:min-h-11"
        />
      </div>
    </div>
  );
};
