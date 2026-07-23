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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Application History</h1>
          <p className="text-muted-foreground text-sm">
            Track your journey across {totalOpportunities} active opportunit{totalOpportunities === 1 ? 'y' : 'ies'}.
          </p>
        </div>
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
