"use client";

import React from 'react';
import { Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApplicationStatus } from '../types';

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
        <p className="text-muted-foreground text-xs">
          Track your journey across {totalOpportunities} active opportunit{totalOpportunities === 1 ? 'y' : 'ies'}.
        </p>
      </div>
      <div className="flex gap-2 items-center">
        <Select value={filterStatus} onValueChange={(val) => onFilterChange(val as ApplicationStatus | "ALL")}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Filter by status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="APPLIED">Applied</SelectItem>
            <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
            <SelectItem value="INTERVIEW_SCHEDULED">Interview Scheduled</SelectItem>
            <SelectItem value="HIRED">Hired</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
