// src/modules/client/company-profile/CompanyProfileModule.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useCompanyProfile } from "./hooks/useCompanyProfile";
import CompanyStatus from "./components/CompanyStatus";
import CompanyBasicInfo from "./components/CompanyBasicInfo";
import CompanyClassification from "./components/CompanyClassification";
import CompanyAddress from "./components/CompanyAddress";
import CompanyCompletionBar from "./components/CompanyCompletionBar";
import CompanyPreviewModal from "./components/CompanyPreviewModal";
import CompanyDocuments from "./components/CompanyDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  Building,
  Layers,
  MapPin,
  ShieldCheck,
  Pencil,
  Globe,
  Loader2,
  Building2,
  Sparkles,
  Eye,
  Send,
  RefreshCw,
  FileText,
} from "lucide-react";
import { EditableCompanyFields } from "./types";

export default function CompanyProfileModule() {
  const {
    company,
    meta,
    loading,
    saving,
    submitting,
    error,
    successMessage,
    fetchProfile,
    updateProfile,
    createProfile,
    submitForVerification,
    clearMessages,
  } = useCompanyProfile();

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [uploadedDocsCount, setUploadedDocsCount] = useState(0);
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [draft, setDraft] = useState<Partial<EditableCompanyFields & { custom_industry_name?: string }>>({});
  const [showPreview, setShowPreview] = useState(false);

  const [setupForm, setSetupForm] = useState({
    company_name: "",
    company_legal_name: "",
    company_email: "",
    company_contact: "",
    company_description: "",
    registration_no: "",
    company_tin: "",
  });
  const [setupError, setSetupError] = useState("");

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");

    if (!setupForm.company_name.trim()) return setSetupError("Company display name is required.");
    if (!setupForm.company_legal_name.trim()) return setSetupError("Legal company name is required.");
    if (!setupForm.company_email.trim()) return setSetupError("Company email is required.");
    if (!setupForm.company_contact.trim()) return setSetupError("Company contact number is required.");
    if (!setupForm.company_description.trim()) return setSetupError("Company description is required.");

    try {
      await createProfile(setupForm);
    } catch (err: unknown) {
      setSetupError(
        err instanceof Error ? err.message : "Failed to create company profile."
      );
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFieldChange = (
    field: keyof EditableCompanyFields | "custom_industry_name",
    value: string | number | boolean | null | undefined
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  // ── Company Information Handlers ──────────────────────────────────────
  const handleEditInfo = () => {
    if (company) {
      setDraft({
        company_name: company.company_name ?? "",
        company_legal_name: company.company_legal_name ?? "",
        company_email: company.company_email ?? "",
        company_contact: company.company_contact ?? "",
        company_website: company.company_website ?? "",
        company_description: company.company_description ?? "",
        company_logo: company.company_logo ?? "",
        company_cover: company.company_cover ?? "",
        company_facebook: company.company_facebook ?? "",
        company_linkedin: company.company_linkedin ?? "",
        company_instagram: company.company_instagram ?? "",
        company_x: company.company_x ?? "",
        company_youtube: company.company_youtube ?? "",
        registration_no: company.registration_no ?? "",
        company_tin: company.company_tin ?? "",
      });
    }
    clearMessages();
    setIsEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    clearMessages();
    await updateProfile({
      company_name: draft.company_name,
      company_legal_name: draft.company_legal_name,
      company_email: draft.company_email,
      company_contact: draft.company_contact,
      company_website: draft.company_website,
      company_description: draft.company_description,
      company_logo: draft.company_logo,
      company_cover: draft.company_cover,
      company_facebook: draft.company_facebook,
      company_linkedin: draft.company_linkedin,
      company_instagram: draft.company_instagram,
      company_x: draft.company_x,
      company_youtube: draft.company_youtube,
      registration_no: draft.registration_no,
      company_tin: draft.company_tin,
    });
    setIsEditingInfo(false);
  };

  const handleCancelInfo = () => {
    setIsEditingInfo(false);
    setDraft({});
    clearMessages();
  };

  // ── Company Classification Handlers ──────────────────────────────────
  const handleEditClassification = () => {
    if (company) {
      setDraft({
        industry_id: company.industry_id ?? null,
        organization_type_id: company.organization_type_id ?? null,
        company_size_id: company.company_size_id ?? null,
        year_established: company.year_established ?? null,
        company_tags: company.company_tags ?? "",
      });
    }
    clearMessages();
    setIsEditingClassification(true);
  };

  const handleSaveClassification = async () => {
    clearMessages();
    let targetIndustryId: number | string | null | undefined = draft.industry_id;

    if (
      draft.industry_id === "OTHERS" ||
      String(draft.industry_id).toUpperCase() === "OTHERS"
    ) {
      const customName = draft.custom_industry_name?.trim();
      if (customName) {
        try {
          const res = await fetch("/api/client/company-profile?directusCollection=vs_industry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ industry_name: customName }),
          });
          const json = await res.json();
          if (res.ok && (json.data?.industry_id || json.industry_id)) {
            targetIndustryId = Number(json.data?.industry_id ?? json.industry_id);
          }
        } catch (err) {
          console.error("Error creating custom industry:", err);
        }
      }
    } else if (draft.industry_id) {
      targetIndustryId = Number(draft.industry_id);
    }

    await updateProfile({
      industry_id: targetIndustryId as number | null,
      organization_type_id: draft.organization_type_id ? Number(draft.organization_type_id) : null,
      company_size_id: draft.company_size_id ? Number(draft.company_size_id) : null,
      year_established: draft.year_established ? Number(draft.year_established) : null,
      company_tags: draft.company_tags,
    });

    await fetchProfile();
    setIsEditingClassification(false);
  };

  const handleCancelClassification = () => {
    setIsEditingClassification(false);
    setDraft({});
    clearMessages();
  };

  // ── Company Address Handlers ──────────────────────────────────────────
  const handleEditAddress = () => {
    if (company) {
      setDraft({
        company_province: company.company_province ?? "",
        company_city: company.company_city ?? "",
        company_brgy: company.company_brgy ?? "",
        company_address: company.company_address ?? "",
        company_zipCode: company.company_zipCode ?? "",
      });
    }
    clearMessages();
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    clearMessages();
    await updateProfile({
      company_province: draft.company_province,
      company_city: draft.company_city,
      company_brgy: draft.company_brgy,
      company_address: draft.company_address,
      company_zipCode: draft.company_zipCode,
    });
    setIsEditingAddress(false);
  };

  const handleCancelAddress = () => {
    setIsEditingAddress(false);
    setDraft({});
    clearMessages();
  };

  // ── Submit / Resubmit Handler ─────────────────────────────────────────
  const handleSubmitForVerification = async () => {
    clearMessages();
    try {
      await submitForVerification();
    } catch {
      // error is already set in hook
    }
  };

  // ── Derived State ─────────────────────────────────────────────────────
  const completionPercent = company?.profile_completion_percent ?? 0;
  const verificationStatus = company?.verification_status;

  const canSubmit =
    completionPercent >= 80 &&
    uploadedDocsCount > 0 &&
    (verificationStatus === "DRAFT" || verificationStatus === "REJECTED");

  const isOwnerOrAdmin =
    meta?.company_user_role === "OWNER" || meta?.company_user_role === "ADMIN";

  const displayDataInfo = isEditingInfo ? draft : (company ?? {});
  const displayDataClassification = isEditingClassification ? draft : (company ?? {});
  const displayDataAddress = isEditingAddress ? draft : (company ?? {});

  // ── Loading ───────────────────────────────────────────────────────────
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

  // ── Onboarding: No company linked ────────────────────────────────────
  if (!loading && !company && error) {
    if (error === "No company associated with this account.") {
      return (
        <div className="max-w-2xl mx-auto py-8">
          <Card className="border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pt-8 pb-6 px-8 text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" /> Welcome to VOS Sync!
              </CardTitle>
              <p className="text-sm text-zinc-550 dark:text-zinc-400 max-w-md mx-auto">
                Let&apos;s set up your company profile to start posting job listings, managing applications, and onboarding talent.
              </p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSetupSubmit} className="space-y-6">
                {setupError && (
                  <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {setupError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="setup-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Company Display Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="setup-name"
                      value={setupForm.company_name}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, company_name: e.target.value }))}
                      placeholder="e.g. Acme Corporation"
                      className="h-10 text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-legal-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Legal Company Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="setup-legal-name"
                      value={setupForm.company_legal_name}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, company_legal_name: e.target.value }))}
                      placeholder="e.g. Acme Corp. Ltd"
                      className="h-10 text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Company Email <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="setup-email"
                      type="email"
                      value={setupForm.company_email}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, company_email: e.target.value }))}
                      placeholder="hr@acme.com"
                      className="h-10 text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-contact" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Company Contact <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="setup-contact"
                      value={setupForm.company_contact}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, company_contact: e.target.value }))}
                      placeholder="09XXXXXXXXX"
                      className="h-10 text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-reg" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Registration Number <span className="text-zinc-400">(Optional)</span>
                    </Label>
                    <Input
                      id="setup-reg"
                      value={setupForm.registration_no}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, registration_no: e.target.value }))}
                      placeholder="e.g. SEC-123456"
                      className="h-10 text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup-tin" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      TIN <span className="text-zinc-400">(Optional)</span>
                    </Label>
                    <Input
                      id="setup-tin"
                      value={setupForm.company_tin}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, company_tin: e.target.value }))}
                      placeholder="e.g. 000-123-456-000"
                      className="h-10 text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-desc" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Company Description <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="setup-desc"
                    value={setupForm.company_description}
                    onChange={(e) => setSetupForm((prev) => ({ ...prev, company_description: e.target.value }))}
                    rows={4}
                    placeholder="Provide a brief description of your company, core business, and culture..."
                    className="text-sm border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg resize-none"
                    required
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Setting Up Profile...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Complete Company Setup
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

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

  return (
    <div className="space-y-6 client-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

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

      {/* Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Left Column ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Company Information */}
          <Card className="shadow-sm border bg-card rounded-xl gap-0 py-0 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Company Information
                </CardTitle>
              </div>
              {isOwnerOrAdmin && !isEditingInfo && (
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium" onClick={handleEditInfo}>
                  <Pencil />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {isEditingInfo ? (
                <div className="space-y-6">
                  <CompanyBasicInfo
                    data={displayDataInfo}
                    onChange={handleFieldChange}
                    readOnly={false}
                  />
                  <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-6">
                    <Button variant="outline" size="sm" onClick={handleCancelInfo} disabled={saving} className="h-9 px-5 text-sm rounded-xl">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveInfo} size="sm" disabled={saving} className="h-9 px-6 text-sm rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 shadow-sm">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <CompanyBasicInfo
                  data={company ?? {}}
                  onChange={() => {}}
                  readOnly={true}
                />
              )}
            </CardContent>
          </Card>

          {/* Card 2: Company Classification */}
          <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Company Classification
                </CardTitle>
              </div>
              {isOwnerOrAdmin && !isEditingClassification && (
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium" onClick={handleEditClassification}>
                  <Pencil />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {isEditingClassification ? (
                <div className="space-y-6">
                  <CompanyClassification
                    data={displayDataClassification}
                    onChange={handleFieldChange}
                    readOnly={false}
                  />
                  <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-6">
                    <Button variant="outline" size="sm" onClick={handleCancelClassification} disabled={saving} className="h-9 px-5 text-sm rounded-xl">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveClassification} size="sm" disabled={saving} className="h-9 px-6 text-sm rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 shadow-sm">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <CompanyClassification
                  data={company ?? {}}
                  onChange={() => {}}
                  readOnly={true}
                />
              )}
            </CardContent>
          </Card>

          {/* Card 3: Company Address */}
          <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Company Address
                </CardTitle>
              </div>
              {isOwnerOrAdmin && !isEditingAddress && (
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium" onClick={handleEditAddress}>
                  <Pencil />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {isEditingAddress ? (
                <div className="space-y-6">
                  <CompanyAddress
                    data={displayDataAddress}
                    onChange={handleFieldChange}
                    readOnly={false}
                  />
                  <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-6">
                    <Button variant="outline" size="sm" onClick={handleCancelAddress} disabled={saving} className="h-9 px-5 text-sm rounded-xl">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveAddress} size="sm" disabled={saving} className="h-9 px-6 text-sm rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 shadow-sm">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Province</span>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{company?.company_province || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">City / Municipality</span>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{company?.company_city || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Barangay</span>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{company?.company_brgy || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Zip Code</span>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{company?.company_zipCode || "—"}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Street Address</span>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{company?.company_address || "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">

          {/* Profile Completion */}
          <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
            <CardContent className="p-6">
              <CompanyCompletionBar percent={completionPercent} />
            </CardContent>
          </Card>

          {/* Verification Status */}
          {company?.verification_status && (
            <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <CompanyStatus
                  status={company.verification_status}
                  remarks={company.rejection_reason || company.verification_remarks}
                />
              </CardContent>
            </Card>
          )}
          {/* Verification Documents */}
          <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Verification Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyDocuments
                companyId={company?.company_id}
                onDocsChange={(count) => setUploadedDocsCount(count)}
              />
            </CardContent>
          </Card>
          {/* Submit / Resubmit for Verification */}
          {isOwnerOrAdmin &&
            (verificationStatus === "DRAFT" || verificationStatus === "REJECTED") && (
              <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                    {verificationStatus === "REJECTED" ? "Resubmit Profile" : "Submit for Verification"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {!canSubmit && (
                    <p className="text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed">
                      Your profile must be at least{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">80% complete</span>,
                      include a company logo, and have at least{" "}
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">one verification document uploaded</span>
                      {" "}before you can submit for verification. Currently at <span className="font-semibold">{Math.round(completionPercent)}%</span> with <span className="font-semibold">{uploadedDocsCount} documents</span> uploaded.
                    </p>
                  )}
                  {canSubmit && verificationStatus === "REJECTED" && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50">
                      Please review the rejection reason above, make the necessary corrections, then resubmit.
                    </p>
                  )}
                  <Button
                    onClick={handleSubmitForVerification}
                    disabled={!canSubmit || submitting}
                    className="w-full h-10 text-sm font-semibold rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 shadow-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : verificationStatus === "REJECTED" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resubmit for Verification
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Verification
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

          {/* Preview Public Profile */}
          {company && (
            <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Public Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Preview how job seekers will see your company profile once it goes public.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  className="w-full h-9 text-sm rounded-xl font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Public Profile
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Public Visibility */}
          <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-row items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Public Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {company?.is_public ? "Public Profile" : "Private Profile"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {company?.is_public
                      ? "Searchable by job seekers and visible on postings."
                      : "Only visible to authorized organization users."}
                  </p>
                </div>
                {isOwnerOrAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={async () => {
                      clearMessages();
                      const nextVal = company?.is_public ? 0 : 1;
                      await updateProfile({ is_public: nextVal });
                    }}
                    className="h-9 px-4 text-xs font-semibold rounded-xl"
                  >
                    Change Visibility
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Preview Modal */}
      {company && (
        <CompanyPreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          company={company}
        />
      )}
    </div>
  );
}
