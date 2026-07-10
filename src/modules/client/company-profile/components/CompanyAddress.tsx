// src/modules/client/company-profile/components/CompanyAddress.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableCompanyFields } from "../types";

interface CompanyAddressProps {
  data: Partial<EditableCompanyFields>;
  onChange: (field: keyof EditableCompanyFields, value: string) => void;
  readOnly?: boolean;
}

export default function CompanyAddress({
  data,
  onChange,
  readOnly = false,
}: CompanyAddressProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <span className="inline-block w-1 h-4 bg-primary rounded-full" />
        Company Address
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-province" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Province <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="cp-province"
            value={data.company_province ?? ""}
            onChange={(e) => onChange("company_province", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Metro Manila"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-city" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            City / Municipality <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="cp-city"
            value={data.company_city ?? ""}
            onChange={(e) => onChange("company_city", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Makati City"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-brgy" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Barangay
          </Label>
          <Input
            id="cp-brgy"
            value={data.company_brgy ?? ""}
            onChange={(e) => onChange("company_brgy", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Barangay Poblacion"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-zipcode" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Zip Code
          </Label>
          <Input
            id="cp-zipcode"
            value={data.company_zipCode ?? ""}
            onChange={(e) => onChange("company_zipCode", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. 1200"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="cp-address" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Street Address
          </Label>
          <Input
            id="cp-address"
            value={data.company_address ?? ""}
            onChange={(e) => onChange("company_address", e.target.value)}
            disabled={readOnly}
            placeholder="e.g. Unit 301, The Hub Building, Ayala Ave."
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

