// src/modules/client/company-profile/components/CompanyBasicInfo.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditableCompanyFields } from "../types";

interface CompanyBasicInfoProps {
  data: Partial<EditableCompanyFields>;
  onChange: (field: keyof EditableCompanyFields, value: string) => void;
  readOnly?: boolean;
}

export default function CompanyBasicInfo({
  data,
  onChange,
  readOnly = false,
}: CompanyBasicInfoProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-primary rounded-full" />
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-company-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cp-company-name"
              value={data.company_name ?? ""}
              onChange={(e) => onChange("company_name", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. Vertex Technologies Corporation"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-company-email" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Email
            </Label>
            <Input
              id="cp-company-email"
              type="email"
              value={data.company_email ?? ""}
              onChange={(e) => onChange("company_email", e.target.value)}
              disabled={readOnly}
              placeholder="hr@company.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-company-contact" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Contact
            </Label>
            <Input
              id="cp-company-contact"
              value={data.company_contact ?? ""}
              onChange={(e) => onChange("company_contact", e.target.value)}
              disabled={readOnly}
              placeholder="09XX-XXX-XXXX"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-company-website" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Website
            </Label>
            <Input
              id="cp-company-website"
              value={data.company_website ?? ""}
              onChange={(e) => onChange("company_website", e.target.value)}
              disabled={readOnly}
              placeholder="https://company.com"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cp-company-description" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Company Description
        </Label>
        <Textarea
          id="cp-company-description"
          value={data.company_description ?? ""}
          onChange={(e) => onChange("company_description", e.target.value)}
          disabled={readOnly}
          rows={4}
          placeholder="Tell job seekers about your company, culture, and mission..."
          className="resize-none text-sm leading-relaxed"
        />
      </div>
    </div>
  );
}

