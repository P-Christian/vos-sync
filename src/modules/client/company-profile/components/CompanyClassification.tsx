// src/modules/client/company-profile/components/CompanyClassification.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2 } from "lucide-react";
import { EditableCompanyFields } from "../types";

interface CompanyClassificationProps {
  data: Partial<EditableCompanyFields>;
  onChange: (field: keyof EditableCompanyFields, value: string | number | null | undefined) => void;
  readOnly?: boolean;
}

interface IndustryItem {
  industry_id: number;
  industry_name: string;
}

interface OrgTypeItem {
  organization_type_id: number;
  organization_type_name: string;
}

interface CompanySizeItem {
  company_size_id: number;
  company_size_name: string;
}

export default function CompanyClassification({
  data,
  onChange,
  readOnly = false,
}: CompanyClassificationProps) {
  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [orgTypes, setOrgTypes] = useState<OrgTypeItem[]>([]);
  const [sizes, setSizes] = useState<CompanySizeItem[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      setLoading(true);
      try {
        const [indRes, orgRes, sizeRes] = await Promise.all([
          fetch("/api/client/company-profile?directusCollection=vs_industry&limit=-1"),
          fetch("/api/client/company-profile?directusCollection=vs_organization_type&limit=-1"),
          fetch("/api/client/company-profile?directusCollection=vs_company_size&limit=-1"),
        ]);

        const [indData, orgData, sizeData] = await Promise.all([
          indRes.json(),
          orgRes.json(),
          sizeRes.json(),
        ]);

        if (indData.errors) console.error("[Classification] vs_industry error:", indData.errors);
        if (orgData.errors) console.error("[Classification] vs_organization_type error:", orgData.errors);
        if (sizeData.errors) console.error("[Classification] vs_company_size error:", sizeData.errors);

        setIndustries(indData.data || []);
        setOrgTypes(orgData.data || []);
        setSizes(sizeData.data || []);
      } catch (err) {
        console.error("Failed to load master classification data", err);
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, []);

  const selectedIndustryName = industries.find(
    (i) => i.industry_id === Number(data.industry_id)
  )?.industry_name || "—";

  const selectedOrgTypeName = orgTypes.find(
    (o) => o.organization_type_id === Number(data.organization_type_id)
  )?.organization_type_name || "—";

  const selectedSizeName = sizes.find(
    (s) => s.company_size_id === Number(data.company_size_id)
  )?.company_size_name || "—";

  if (readOnly) {
    return (
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-primary rounded-full" />
          Company Classification
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Industry</span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedIndustryName}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Organization Type</span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedOrgTypeName}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Size</span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedSizeName}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Year Established</span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.year_established || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tags</span>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.company_tags || "—"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <span className="inline-block w-1 h-4 bg-primary rounded-full" />
        Company Classification
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-industry" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Industry <span className="text-rose-500">*</span></span>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </Label>
          <SearchableSelect
            options={industries.map((i) => ({ value: String(i.industry_id), label: i.industry_name }))}
            value={data.industry_id ? String(data.industry_id) : ""}
            onValueChange={(v) => onChange("industry_id", Number(v))}
            disabled={loading}
            placeholder="Select industry"
            className="h-9 border-zinc-200 font-normal focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-business-type" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Organization Type</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </Label>
          <SearchableSelect
            options={orgTypes.map((t) => ({ value: String(t.organization_type_id), label: t.organization_type_name }))}
            value={data.organization_type_id ? String(data.organization_type_id) : ""}
            onValueChange={(v) => onChange("organization_type_id", Number(v))}
            disabled={loading}
            placeholder="Select type"
            className="h-9 border-zinc-200 font-normal focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-company-size" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Company Size</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </Label>
          <SearchableSelect
            options={sizes.map((s) => ({ value: String(s.company_size_id), label: s.company_size_name }))}
            value={data.company_size_id ? String(data.company_size_id) : ""}
            onValueChange={(v) => onChange("company_size_id", Number(v))}
            disabled={loading}
            placeholder="Select size"
            className="h-9 border-zinc-200 font-normal focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-year-established" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Year Established
          </Label>
          <Input
            id="cp-year-established"
            type="number"
            value={data.year_established ?? ""}
            onChange={(e) => onChange("year_established", e.target.value ? Number(e.target.value) : "")}
            placeholder="e.g. 2026"
            className="h-9 text-sm"
          />
        </div>



        <div className="space-y-1.5">
          <Label htmlFor="cp-tags" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Tags
          </Label>
          <Input
            id="cp-tags"
            value={data.company_tags ?? ""}
            onChange={(e) => onChange("company_tags", e.target.value)}
            placeholder="e.g. Software, Outsourcing"
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
