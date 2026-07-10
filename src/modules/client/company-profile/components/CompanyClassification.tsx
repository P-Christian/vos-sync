// src/modules/client/company-profile/components/CompanyClassification.tsx
"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditableCompanyFields } from "../types";

interface CompanyClassificationProps {
  data: Partial<EditableCompanyFields>;
  onChange: (field: keyof EditableCompanyFields, value: string) => void;
  readOnly?: boolean;
}

const INDUSTRIES = [
  "Agriculture",
  "Architecture & Engineering",
  "Arts & Entertainment",
  "Automotive",
  "Banking & Finance",
  "BPO / Call Center",
  "Construction",
  "Consulting",
  "Education & Training",
  "Energy & Utilities",
  "Food & Beverage",
  "Government & Public Sector",
  "Healthcare & Medical",
  "Hospitality & Tourism",
  "Human Resources",
  "Information Technology",
  "Insurance",
  "Legal & Law",
  "Logistics & Supply Chain",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Communications",
  "Non-Profit / NGO",
  "Real Estate",
  "Retail & E-Commerce",
  "Telecommunications",
  "Transportation",
  "Others",
];

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation",
  "Cooperative",
  "Government Agency",
  "Non-Profit Organization",
  "Others",
];

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1001-5000 employees",
  "5000+ employees",
];

export default function CompanyClassification({
  data,
  onChange,
  readOnly = false,
}: CompanyClassificationProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <span className="inline-block w-1 h-4 bg-primary rounded-full" />
        Company Classification
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-industry" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Industry <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={data.industry ?? ""}
            onValueChange={(v) => onChange("industry", v)}
            disabled={readOnly}
          >
            <SelectTrigger id="cp-industry" className="h-9 text-sm">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i} className="text-sm">
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-business-type" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Business Type
          </Label>
          <Select
            value={data.business_type ?? ""}
            onValueChange={(v) => onChange("business_type", v)}
            disabled={readOnly}
          >
            <SelectTrigger id="cp-business-type" className="h-9 text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-sm">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-company-size" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Company Size
          </Label>
          <Select
            value={data.company_size ?? ""}
            onValueChange={(v) => onChange("company_size", v)}
            disabled={readOnly}
          >
            <SelectTrigger id="cp-company-size" className="h-9 text-sm">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s} value={s} className="text-sm">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

