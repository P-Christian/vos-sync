// src/modules/client/company-profile/CompanyProfileModule.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useCompanyProfile } from "./hooks/useCompanyProfile";
import CompanyStatus from "./components/CompanyStatus";
import CompanyBasicInfo from "./components/CompanyBasicInfo";
import CompanyClassification from "./components/CompanyClassification";
import CompanyAddress from "./components/CompanyAddress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Building2, Pencil, Save, X, CheckCircle } from "lucide-react";
import { EditableCompanyFields } from "./types";

export default function CompanyProfileModule() {
  const {
    company,
    meta,
    loading,
    saving,
    error,
    successMessage,
    fetchProfile,
    updateProfile,
    clearMessages,
  } = useCompanyProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<EditableCompanyFields>>({});

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEditStart = () => {
    if (company) {
      setDraft({
        company_name: company.company_name ?? "",
        company_email: company.company_email ?? "",
        company_contact: company.company_contact ?? "",
        company_website: company.company_website ?? "",
        company_description: company.company_description ?? "",
        industry: company.industry ?? "",
        business_type: company.business_type ?? "",
        company_size: company.company_size ?? "",
        company_province: company.company_province ?? "",
        company_city: company.company_city ?? "",
        company_brgy: company.company_brgy ?? "",
        company_address: company.company_address ?? "",
        company_zipCode: company.company_zipCode ?? "",
      });
    }
    clearMessages();
    setIsEditing(true);
  };

  const handleFieldChange = (
    field: keyof EditableCompanyFields,
    value: string
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    clearMessages();
    await updateProfile(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft({});
    clearMessages();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-zinc-500 font-medium animate-pulse text-sm">
          Loading company profile...
        </p>
      </div>
    );
  }

  // Error with no company data
  if (!loading && !company && error) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Card className="border-rose-100 shadow-md">
          <CardContent className="p-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Unable to Load Profile
            </h3>
            <p className="text-sm text-zinc-500">{error}</p>
            <Button onClick={fetchProfile} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayData = isEditing ? draft : (company ?? {});
  const isOwnerOrAdmin =
    meta?.company_user_role === "OWNER" || meta?.company_user_role === "ADMIN";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 text-white p-6 rounded-3xl border shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl text-white border border-white/10 shrink-0">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {company?.company_name ?? "Company Profile"}
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {company?.industry ?? "—"} &bull;{" "}
              {company?.company_city ?? "—"},{" "}
              {company?.company_province ?? "—"}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Code: {company?.company_code ?? "—"} &bull; Role:{" "}
              <span className="text-zinc-300 font-medium">
                {meta?.company_user_role ?? "—"}
              </span>
            </p>
          </div>
        </div>

        {isOwnerOrAdmin && (
          <div className="flex items-center gap-3 relative z-10 shrink-0 w-full md:w-auto">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 md:flex-none h-10 bg-primary hover:bg-primary/90 rounded-xl text-sm font-medium gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={saving}
                  variant="outline"
                  className="flex-1 md:flex-none h-10 border-white/20 text-white bg-transparent hover:bg-white/10 rounded-xl text-sm font-medium gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEditStart}
                variant="outline"
                className="flex-1 md:flex-none h-10 border-white/20 text-white bg-transparent hover:bg-white/10 rounded-xl text-sm font-medium gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Verification Status Banner */}
      {company?.verification_status && (
        <CompanyStatus
          status={company.verification_status}
          remarks={company.verification_remarks}
        />
      )}

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Profile Form */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <CompanyBasicInfo
            data={displayData}
            onChange={handleFieldChange}
            readOnly={!isEditing}
          />
          <Separator />
          <CompanyClassification
            data={displayData}
            onChange={handleFieldChange}
            readOnly={!isEditing}
          />
          <Separator />
          <CompanyAddress
            data={displayData}
            onChange={handleFieldChange}
            readOnly={!isEditing}
          />

          {isEditing && (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="h-9 px-5 text-sm rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-5 text-sm rounded-lg gap-1.5"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

