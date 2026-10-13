// src/modules/client/dashboard/components/DashboardFilters.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-lg rounded-xl">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search jobs or applicants..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-10 w-full bg-white/70 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800/50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[180px]">
          <SearchableSelect
            options={[
              { value: "ALL", label: "All Departments" },
              ...departments.map((dept) => ({ value: dept, label: dept })),
            ]}
            value={filters.department || "ALL"}
            onValueChange={handleDeptChange}
            placeholder="All Departments"
            className="h-10 bg-white/70 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800/50"
          />
        </div>

        <div className="w-[150px]">
          <SearchableSelect
            options={[
              { value: "ALL", label: "All Statuses" },
              ...statuses.map((status) => ({ value: status, label: status })),
            ]}
            value={filters.status || "ALL"}
            onValueChange={handleStatusChange}
            placeholder="All Statuses"
            className="h-10 bg-white/70 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800/50"
          />
        </div>
      </div>
    </div>
  );
}

