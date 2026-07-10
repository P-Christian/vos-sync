// src/modules/client/dashboard/components/DashboardFilters.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterState } from "../types";
import { Search } from "lucide-react";

interface DashboardFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  departments: string[];
  statuses: string[];
}

export default function DashboardFilters({
  filters,
  onFilterChange,
  departments,
  statuses,
}: DashboardFiltersProps) {
  const handleSearchChange = (val: string) => {
    onFilterChange({ ...filters, search: val });
  };

  const handleDeptChange = (val: string) => {
    onFilterChange({ ...filters, department: val === "ALL" ? "" : val });
  };

  const handleStatusChange = (val: string) => {
    onFilterChange({ ...filters, status: val === "ALL" ? "" : val });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-xl bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search jobs or applicants..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-10 w-full bg-white dark:bg-zinc-900 border-zinc-200"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[180px]">
          <Select
            value={filters.department || "ALL"}
            onValueChange={handleDeptChange}
          >
            <SelectTrigger className="h-10 bg-white dark:bg-zinc-900 border-zinc-200">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[150px]">
          <Select
            value={filters.status || "ALL"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="h-10 bg-white dark:bg-zinc-900 border-zinc-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

