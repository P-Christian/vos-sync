"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";

interface UserManagementFiltersProps {
  roleFilter: string;
  onRoleChange: (role: string) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
}

export const UserManagementFilters: React.FC<UserManagementFiltersProps> = ({
  roleFilter,
  onRoleChange,
  searchQuery,
  onSearchChange,
}) => {
  const roleDropdownOptions = [
    { value: "ALL", label: "All Roles" },
    { value: "1", label: "Freelancer" },
    { value: "2", label: "Client / Employer" },
    { value: "3", label: "Admin" },
    { value: "4", label: "School Admin" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
        <NativeSelect
          value={roleFilter}
          onChange={(e) => onRoleChange(e.target.value)}
          className="w-full sm:w-60 bg-background text-xs"
        >
          {roleDropdownOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
};
