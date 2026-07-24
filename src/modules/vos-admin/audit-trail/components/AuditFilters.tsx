// src/modules/vos-admin/audit-trail/components/AuditFilters.tsx
"use client";

import React from 'react';
import { AuditFilters as AuditFiltersType } from '../types/audit.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw, Download, SlidersHorizontal } from 'lucide-react';

interface AuditFiltersProps {
  filters: AuditFiltersType;
  onFilterChange: (newFilters: Partial<AuditFiltersType>) => void;
  onReset: () => void;
  onExportCSV: () => void;
  onOpenSettings?: () => void;
  isExporting?: boolean;
}

const CATEGORIES = [
  { value: "ALL", label: "All Categories" },
  { value: "AUTHENTICATION", label: "Authentication" },
  { value: "USER", label: "User Management" },
  { value: "COMPANY", label: "Company Verification" },
  { value: "EMPLOYEE", label: "Employee Actions" },
  { value: "SCHOOL", label: "School Actions" },
  { value: "JOB", label: "Job Module" },
  { value: "APPLICATION", label: "Application Module" },
  { value: "MESSAGE", label: "Message" },
  { value: "NOTIFICATION", label: "Notification" },
  { value: "ADMIN", label: "Administrative" },
  { value: "SYSTEM", label: "System" },
];

const ACTIONS = [
  { value: "ALL", label: "All Actions" },
  { value: "CREATE", label: "CREATE / REGISTER" },
  { value: "UPDATE", label: "UPDATE / EDIT" },
  { value: "DELETE", label: "DELETE" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "FAILED_LOGIN", label: "FAILED LOGIN" },
  { value: "LOCKOUT", label: "LOCKOUT" },
  { value: "VERIFY", label: "VERIFY" },
  { value: "OTP_VERIFY", label: "OTP VERIFY" },
  { value: "PASSWORD_RESET", label: "PASSWORD RESET" },
  { value: "ACCOUNT_RECOVERY", label: "ACCOUNT RECOVERY" },
  { value: "ROLE_ASSIGN", label: "ROLE ASSIGN" },
  { value: "ROLE_REVOKE", label: "ROLE REVOKE" },
  { value: "PERMISSION_CHANGE", label: "PERMISSION CHANGE" },
  { value: "SUBMIT", label: "SUBMIT" },
  { value: "REJECT", label: "REJECT" },
  { value: "DOC_UPLOAD", label: "DOCUMENT UPLOAD" },
  { value: "DOC_DELETE", label: "DOCUMENT DELETE" },
  { value: "OVERRIDE", label: "VERIFICATION OVERRIDE" },
  { value: "PUBLISH", label: "PUBLISH PROFILE" },
  { value: "POST", label: "JOB POSTED" },
  { value: "CLOSE", label: "JOB CLOSED" },
  { value: "SCHEDULE", label: "INTERVIEW SCHEDULED" },
  { value: "OFFER_SENT", label: "OFFER SENT" },
  { value: "EXPORT", label: "EXPORT" },
  { value: "SEARCH", label: "SEARCH" },
  { value: "VIEW_AUDIT", label: "VIEW AUDIT" },
  { value: "RETENTION_CHANGE", label: "RETENTION CHANGE" },
  { value: "LEGAL_HOLD", label: "LEGAL HOLD" },
  { value: "CONFIG_CHANGE", label: "CONFIG CHANGE" },
];

const STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
  { value: "DENIED", label: "DENIED" },
];

const ACTOR_TYPES = [
  { value: "ALL", label: "All Actors" },
  { value: "USER", label: "User" },
  { value: "ADMIN", label: "Admin" },
  { value: "SERVICE", label: "Service" },
  { value: "SYSTEM", label: "System" },
];

const ORG_TYPES = [
  { value: "ALL", label: "All Organizations" },
  { value: "EMPLOYER", label: "Employer" },
  { value: "FREELANCER", label: "Freelancer" },
  { value: "SCHOOL", label: "School" },
  { value: "PLATFORM", label: "Platform" },
];

export function AuditFilters({
  filters,
  onFilterChange,
  onReset,
  onExportCSV,
  onOpenSettings,
  isExporting,
}: AuditFiltersProps) {
  return (
    <div className="space-y-4 b p-4 rounded-xl border">
      {/* Top Row: Search & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search event type, reason, resource ID, correlation ID..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="pl-9 "
          />
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Audit Settings
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onExportCSV}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Bottom Grid: Filter Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {/* Category */}
        <Select
          value={filters.event_category || "ALL"}
          onValueChange={(val) => onFilterChange({ event_category: val, page: 1 })}
        >
          <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action */}
        <Select
          value={filters.action || "ALL"}
          onValueChange={(val) => onFilterChange({ action: val, page: 1 })}
        >
          <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status || "ALL"}
          onValueChange={(val) => onFilterChange({ status: val, page: 1 })}
        >
          <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Actor Type */}
        <Select
          value={filters.actor_type || "ALL"}
          onValueChange={(val) => onFilterChange({ actor_type: val, page: 1 })}
        >
          <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Actor Type" />
          </SelectTrigger>
          <SelectContent>
            {ACTOR_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Org Type */}
        <Select
          value={filters.organization_type || "ALL"}
          onValueChange={(val) => onFilterChange({ organization_type: val, page: 1 })}
        >
          <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Org Type" />
          </SelectTrigger>
          <SelectContent>
            {ORG_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Input
          type="date"
          value={filters.date_from || ""}
          onChange={(e) => onFilterChange({ date_from: e.target.value, page: 1 })}
          className="h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          placeholder="Date From"
        />
      </div>
    </div>
  );
}
