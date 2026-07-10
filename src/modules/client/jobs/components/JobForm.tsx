// src/modules/client/jobs/components/JobForm.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobFormData, JOB_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS, JobType, ExperienceLevel, JobStatus } from "../types";

interface JobFormProps {
  data: JobFormData;
  onChange: (field: keyof JobFormData, value: string | boolean) => void;
  errors?: Partial<Record<keyof JobFormData, string>>;
}

export default function JobForm({ data, onChange, errors }: JobFormProps) {
  return (
    <div className="space-y-5">
      {/* Job Title */}
      <div className="space-y-1.5">
        <Label htmlFor="jf-title" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Job Title <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="jf-title"
          value={data.job_title}
          onChange={(e) => onChange("job_title", e.target.value)}
          placeholder="e.g. Senior Full Stack Engineer"
          className={`h-9 text-sm ${errors?.job_title ? "border-rose-400" : ""}`}
        />
        {errors?.job_title && (
          <p className="text-[11px] text-rose-500">{errors.job_title}</p>
        )}
      </div>

      {/* Job Type & Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="jf-type" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Job Type <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={data.job_type}
            onValueChange={(v) => onChange("job_type", v as JobType)}
          >
            <SelectTrigger id="jf-type" className={`h-9 text-sm ${errors?.job_type ? "border-rose-400" : ""}`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(JOB_TYPE_LABELS) as [JobType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.job_type && <p className="text-[11px] text-rose-500">{errors.job_type}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jf-dept" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Department
          </Label>
          <Input
            id="jf-dept"
            value={data.job_department}
            onChange={(e) => onChange("job_department", e.target.value)}
            placeholder="e.g. Engineering"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Location & Experience */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="jf-location" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Location <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="jf-location"
            value={data.job_location}
            onChange={(e) => onChange("job_location", e.target.value)}
            placeholder="e.g. Makati (Hybrid)"
            className={`h-9 text-sm ${errors?.job_location ? "border-rose-400" : ""}`}
          />
          {errors?.job_location && <p className="text-[11px] text-rose-500">{errors.job_location}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jf-exp" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Experience Level
          </Label>
          <Select
            value={data.experience_level}
            onValueChange={(v) => onChange("experience_level", v as ExperienceLevel)}
          >
            <SelectTrigger id="jf-exp" className="h-9 text-sm">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(EXPERIENCE_LEVEL_LABELS) as [ExperienceLevel, string][]).map(
                ([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Salary */}
      <div className="space-y-2.5">
        <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Salary Range</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="jf-sal-min" className="text-[10px] text-zinc-500">Minimum (₱)</Label>
            <Input
              id="jf-sal-min"
              type="number"
              min={0}
              value={data.salary_min}
              onChange={(e) => onChange("salary_min", e.target.value)}
              placeholder="e.g. 25000"
              disabled={data.salary_negotiable}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="jf-sal-max" className="text-[10px] text-zinc-500">Maximum (₱)</Label>
            <Input
              id="jf-sal-max"
              type="number"
              min={0}
              value={data.salary_max}
              onChange={(e) => onChange("salary_max", e.target.value)}
              placeholder="e.g. 50000"
              disabled={data.salary_negotiable}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="jf-negotiable"
            checked={data.salary_negotiable}
            onCheckedChange={(v) => onChange("salary_negotiable", Boolean(v))}
          />
          <Label htmlFor="jf-negotiable" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
            Salary is negotiable / undisclosed
          </Label>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label htmlFor="jf-status" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Posting Status
        </Label>
        <Select
          value={data.status}
          onValueChange={(v) => onChange("status", v as JobStatus)}
        >
          <SelectTrigger id="jf-status" className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE" className="text-sm">Active — Visible to job seekers</SelectItem>
            <SelectItem value="DRAFT" className="text-sm">Draft — Save without publishing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="jf-desc" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Job Description
        </Label>
        <Textarea
          id="jf-desc"
          value={data.job_description}
          onChange={(e) => onChange("job_description", e.target.value)}
          rows={5}
          placeholder="Describe the role, responsibilities, and what the day-to-day looks like..."
          className="resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Requirements */}
      <div className="space-y-1.5">
        <Label htmlFor="jf-req" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Requirements & Qualifications
        </Label>
        <Textarea
          id="jf-req"
          value={data.job_requirements}
          onChange={(e) => onChange("job_requirements", e.target.value)}
          rows={5}
          placeholder="List required skills, education, certifications, and experience..."
          className="resize-none text-sm leading-relaxed"
        />
      </div>
    </div>
  );
}

