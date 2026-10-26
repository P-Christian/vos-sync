"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { formatAssetUrl } from "@/lib/utils";
import {
  PlatformCompany,
  PlatformCompanyFormData,
  PlatformCompanyValue,
} from "../types/platformCompany.types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Building2,
  FileText,
  Share2,
  Settings,
  HeartHandshake,
  ShieldCheck,
  Zap,
  Award,
  Users,
  Star,
  Globe,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Target,
  UploadCloud,
  RotateCcw,
} from "lucide-react";

interface SinglePlatformCompanyEditorProps {
  company: PlatformCompany;
  onSave: (data: PlatformCompanyFormData) => Promise<void>;
  saving: boolean;
}

const AVAILABLE_ICONS = [
  { label: "Heart Handshake", value: "HeartHandshake", icon: HeartHandshake },
  { label: "Shield Check", value: "ShieldCheck", icon: ShieldCheck },
  { label: "Zap (Speed)", value: "Zap", icon: Zap },
  { label: "Award (Quality)", value: "Award", icon: Award },
  { label: "Users (Community)", value: "Users", icon: Users },
  { label: "Star (Excellence)", value: "Star", icon: Star },
  { label: "Globe (Global)", value: "Globe", icon: Globe },
  { label: "Target (Precision)", value: "Target", icon: Target },
  { label: "Sparkles (Innovation)", value: "Sparkles", icon: Sparkles },
  { label: "Briefcase (Work)", value: "Briefcase", icon: Briefcase },
  { label: "Building (Enterprise)", value: "Building2", icon: Building2 },
];

const COLOR_THEMES = [
  { label: "Blue", value: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { label: "Emerald", value: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { label: "Amber", value: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { label: "Purple", value: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { label: "Rose", value: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  { label: "Sky", value: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
];

export const isUploadedIcon = (iconStr?: string | null): boolean => {
  if (!iconStr) return false;
  return (
    iconStr.startsWith("http://") ||
    iconStr.startsWith("https://") ||
    iconStr.startsWith("/api/assets/") ||
    iconStr.startsWith("/") ||
    iconStr.startsWith("data:") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(iconStr)
  );
};

function extractInitialValues(company: PlatformCompany): PlatformCompanyValue[] {
  const normalize = (v: PlatformCompanyValue, idx: number): PlatformCompanyValue => ({
    id: v.id,
    company_id: v.company_id,
    title: v.title || `Core Value #${idx + 1}`,
    description: v.description || v.desc || "",
    desc: v.description || v.desc || "",
    icon_name: v.icon_name || (typeof v.icon === "string" ? v.icon : "HeartHandshake"),
    icon: v.icon_name || (typeof v.icon === "string" ? v.icon : "HeartHandshake"),
    color: v.color || COLOR_THEMES[idx % COLOR_THEMES.length].value,
    display_order: typeof v.display_order === "number" ? v.display_order : idx + 1,
    is_active: v.is_active !== false && Number(v.is_active) !== 0,
  });

  if (Array.isArray(company.values) && company.values.length > 0) {
    return company.values.slice(0, 4).map(normalize);
  }
  const metaValues = (company.metadata as Record<string, unknown> | null)?.values;
  if (Array.isArray(metaValues) && metaValues.length > 0) {
    return (metaValues as PlatformCompanyValue[]).slice(0, 4).map(normalize);
  }
  return [
    {
      title: "People First",
      description: "We put job seekers and employers at the center of every product decision we make.",
      desc: "We put job seekers and employers at the center of every product decision we make.",
      icon_name: "HeartHandshake",
      icon: "HeartHandshake",
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      display_order: 1,
      is_active: true,
    },
    {
      title: "Trust & Safety",
      description: "Every listing is verified. We work hard to keep our platform free from scams and bad actors.",
      desc: "Every listing is verified. We work hard to keep our platform free from scams and bad actors.",
      icon_name: "ShieldCheck",
      icon: "ShieldCheck",
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      display_order: 2,
      is_active: true,
    },
    {
      title: "Speed Matters",
      description: "Hiring moves fast. Our platform is designed to match candidates and companies in days, not months.",
      desc: "Hiring moves fast. Our platform is designed to match candidates and companies in days, not months.",
      icon_name: "Zap",
      icon: "Zap",
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      display_order: 3,
      is_active: true,
    },
    {
      title: "Quality over Quantity",
      description: "Smart role matching means fewer irrelevant applications and higher placement satisfaction.",
      desc: "Smart role matching means fewer irrelevant applications and higher placement satisfaction.",
      icon_name: "Award",
      icon: "Award",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      display_order: 4,
      is_active: true,
    },
  ];
}

export function SinglePlatformCompanyEditor({
  company,
  onSave,
  saving,
}: SinglePlatformCompanyEditorProps) {
  const [formData, setFormData] = useState<PlatformCompanyFormData>({
    slug: company.slug || "vos-sync",
    company_code: company.company_code || "VTC",
    company_name: company.company_name || "VOS Sync",
    company_legal_name: company.company_legal_name || "Vertex Technologies Corporation",
    platform_name:
      company.platform_name ||
      ((company.metadata as Record<string, unknown> | null)?.platform_name as string) ||
      "VOS Sync",
    platform_icon:
      company.platform_icon ||
      ((company.metadata as Record<string, unknown> | null)?.platform_icon as string) ||
      "Briefcase",
    support_hours_days:
      company.support_hours_days ||
      ((company.metadata as Record<string, unknown> | null)?.support_hours_days as string) ||
      "Mon–Fri",
    support_hours_time:
      company.support_hours_time ||
      ((company.metadata as Record<string, unknown> | null)?.support_hours_time as string) ||
      "8am–5pm",
    support_hours_timezone:
      company.support_hours_timezone ||
      ((company.metadata as Record<string, unknown> | null)?.support_hours_timezone as string) ||
      "Philippine Time (PHT)",
    company_tagline: company.company_tagline || "Where Lines Meet.",
    year_established: company.year_established ?? 2024,
    organization_type_id: company.organization_type_id ?? null,
    industry_id: company.industry_id ?? null,
    company_size_id: company.company_size_id ?? null,
    company_address: company.company_address || "Gonzales Street",
    company_brgy: company.company_brgy || "Bonuan Boquig",
    company_city: company.company_city || "Dagupan",
    company_province: company.company_province || "Pangasinan",
    company_country: company.company_country || "PH",
    company_zipCode: company.company_zipCode || "2400",
    map_embed_url: company.map_embed_url || "",
    registration_no: company.registration_no || "",
    company_tin: company.company_tin || "",
    company_contact: company.company_contact || "+639451232521",
    company_email: company.company_email || "contact@vosync.com",
    support_email: company.support_email || "support@vosync.com",
    company_website: company.company_website || "www.vosync.com",
    company_logo: company.company_logo || "",
    company_cover: company.company_cover || "",
    company_facebook: company.company_facebook || "",
    company_linkedin: company.company_linkedin || "",
    company_instagram: company.company_instagram || "",
    company_x: company.company_x || "",
    company_youtube: company.company_youtube || "",
    company_short_description: company.company_short_description || "",
    company_description: company.company_description || "",
    company_mission: company.company_mission || "",
    company_vision: company.company_vision || "",
    company_culture: company.company_culture || "",
    company_benefits: company.company_benefits || "",
    company_tags: company.company_tags || "",
    metadata: company.metadata ?? null,
    is_primary: 1,
    is_active: 1,
    display_order: 1,
  });

  const [valuesList, setValuesList] = useState<PlatformCompanyValue[]>(() =>
    extractInitialValues(company)
  );

  const [metadataJsonText, setMetadataJsonText] = useState<string>(() =>
    company.metadata ? JSON.stringify(company.metadata, null, 2) : ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("identity");

  const [prevCompany, setPrevCompany] = useState<PlatformCompany>(company);
  if (company !== prevCompany) {
    setPrevCompany(company);
    setFormData((prev) => ({
      ...prev,
      slug: company.slug || prev.slug,
      company_code: company.company_code || prev.company_code,
      company_name: company.company_name || prev.company_name,
      company_legal_name: company.company_legal_name || prev.company_legal_name,
      platform_name:
        company.platform_name ||
        ((company.metadata as Record<string, unknown> | null)?.platform_name as string) ||
        prev.platform_name,
      platform_icon:
        company.platform_icon ||
        ((company.metadata as Record<string, unknown> | null)?.platform_icon as string) ||
        prev.platform_icon,
      support_hours_days:
        company.support_hours_days ||
        ((company.metadata as Record<string, unknown> | null)?.support_hours_days as string) ||
        prev.support_hours_days,
      support_hours_time:
        company.support_hours_time ||
        ((company.metadata as Record<string, unknown> | null)?.support_hours_time as string) ||
        prev.support_hours_time,
      support_hours_timezone:
        company.support_hours_timezone ||
        ((company.metadata as Record<string, unknown> | null)?.support_hours_timezone as string) ||
        prev.support_hours_timezone,
      company_tagline: company.company_tagline ?? prev.company_tagline,
      year_established: company.year_established ?? prev.year_established,
      company_address: company.company_address ?? prev.company_address,
      company_brgy: company.company_brgy ?? prev.company_brgy,
      company_city: company.company_city ?? prev.company_city,
      company_province: company.company_province ?? prev.company_province,
      company_country: company.company_country || prev.company_country,
      company_zipCode: company.company_zipCode ?? prev.company_zipCode,
      map_embed_url: company.map_embed_url ?? prev.map_embed_url,
      registration_no: company.registration_no ?? prev.registration_no,
      company_tin: company.company_tin ?? prev.company_tin,
      company_contact: company.company_contact || prev.company_contact,
      company_email: company.company_email || prev.company_email,
      support_email: company.support_email ?? prev.support_email,
      company_website: company.company_website ?? prev.company_website,
      company_logo: company.company_logo ?? prev.company_logo,
      company_cover: company.company_cover ?? prev.company_cover,
      company_facebook: company.company_facebook ?? prev.company_facebook,
      company_linkedin: company.company_linkedin ?? prev.company_linkedin,
      company_instagram: company.company_instagram ?? prev.company_instagram,
      company_x: company.company_x ?? prev.company_x,
      company_youtube: company.company_youtube ?? prev.company_youtube,
      company_short_description: company.company_short_description ?? prev.company_short_description,
      company_description: company.company_description ?? prev.company_description,
      company_mission: company.company_mission ?? prev.company_mission,
      company_vision: company.company_vision ?? prev.company_vision,
      company_culture: company.company_culture ?? prev.company_culture,
      company_benefits: company.company_benefits ?? prev.company_benefits,
      company_tags: company.company_tags ?? prev.company_tags,
    }));
    setValuesList(extractInitialValues(company));
    setMetadataJsonText(company.metadata ? JSON.stringify(company.metadata, null, 2) : "");
  }

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadingBrandIcon, setUploadingBrandIcon] = useState<boolean>(false);
  const brandIconInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof PlatformCompanyFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const MAX_VALUES = 4;
  const isMaxValues = valuesList.length >= MAX_VALUES;

  const handleAddValue = () => {
    if (valuesList.length >= MAX_VALUES) return;
    setValuesList((prev) => [
      ...prev,
      {
        title: "New Company Value",
        description: "Description of this organizational value and how it impacts work.",
        desc: "Description of this organizational value and how it impacts work.",
        icon_name: "HeartHandshake",
        icon: "HeartHandshake",
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        display_order: prev.length + 1,
        is_active: true,
      },
    ]);
  };

  const handleUpdateValue = (index: number, updates: Partial<PlatformCompanyValue>) => {
    setValuesList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveValue = (index: number) => {
    setValuesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadValueIcon = async (idx: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      const msg = "Please select an image file (PNG, SVG, JPG, WEBP).";
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const msg = "Image file size cannot exceed 10MB.";
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    setUploadingIdx(idx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vos-admin/platform-company/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Failed to upload image.");
      }
      const json = await res.json();
      const fileUrl = json.file_url || `/api/assets/${json.file_id}`;
      handleUpdateValue(idx, {
        icon_name: fileUrl,
        icon: fileUrl,
      });
      toast.success("Value card icon uploaded successfully.");
    } catch (err: unknown) {
      const e = err as Error;
      const msg = e.message || "Failed to upload image icon.";
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleBrandIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const msg = "Please select an image file (PNG, SVG, JPG, WEBP).";
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const msg = "Image file size cannot exceed 10MB.";
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    setUploadingBrandIcon(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vos-admin/platform-company/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("Failed to upload brand image icon.");
      }
      const json = await res.json();
      const fileUrl = json.file_url || `/api/assets/${json.file_id}`;
      handleChange("platform_icon", fileUrl);
      toast.success("Brand icon uploaded successfully.");
    } catch (err: unknown) {
      const e = err as Error;
      const msg = e.message || "Failed to upload brand icon.";
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setUploadingBrandIcon(false);
      if (brandIconInputRef.current) brandIconInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.company_name?.trim()) {
      const msg = "Company Name is required.";
      setValidationError(msg);
      toast.error(msg);
      setActiveTab("identity");
      return;
    }
    if (!formData.company_legal_name?.trim()) {
      const msg = "Legal Registered Name is required.";
      setValidationError(msg);
      toast.error(msg);
      setActiveTab("identity");
      return;
    }
    if (!formData.company_code?.trim()) {
      const msg = "Company Code is required.";
      setValidationError(msg);
      toast.error(msg);
      setActiveTab("identity");
      return;
    }
    if (!formData.slug?.trim()) {
      const msg = "URL Slug is required.";
      setValidationError(msg);
      toast.error(msg);
      setActiveTab("identity");
      return;
    }
    if (!formData.company_contact?.trim()) {
      const msg = "Primary Contact Number is required.";
      setValidationError(msg);
      toast.error(msg);
      setActiveTab("contact");
      return;
    }
    if (!formData.company_email?.trim()) {
      const msg = "General Email is required.";
      setValidationError(msg);
      toast.error(msg);
      setActiveTab("contact");
      return;
    }

    let parsedMetadata: Record<string, unknown> = {};
    if (metadataJsonText.trim()) {
      try {
        parsedMetadata = JSON.parse(metadataJsonText);
      } catch {
        const msg = "Invalid JSON in System Metadata. Please check syntax.";
        setValidationError(msg);
        toast.error(msg);
        setActiveTab("settings");
        return;
      }
    } else if (formData.metadata && typeof formData.metadata === "object") {
      parsedMetadata = { ...formData.metadata };
    }

    const finalValues = valuesList.slice(0, MAX_VALUES).map((v, i) => ({
      ...v,
      company_id: company.company_id,
      description: v.description || v.desc || "",
      desc: v.description || v.desc || "",
      icon_name: v.icon_name || (typeof v.icon === "string" ? v.icon : "HeartHandshake"),
      icon: v.icon_name || (typeof v.icon === "string" ? v.icon : "HeartHandshake"),
      display_order: typeof v.display_order === "number" ? v.display_order : i + 1,
    }));
    parsedMetadata.values = finalValues;
    parsedMetadata.platform_name = formData.platform_name || "VOS Sync";
    parsedMetadata.platform_icon = formData.platform_icon || "Briefcase";
    parsedMetadata.support_hours_days = formData.support_hours_days || "Mon–Fri";
    parsedMetadata.support_hours_time = formData.support_hours_time || "8am–5pm";
    parsedMetadata.support_hours_timezone = formData.support_hours_timezone || "Philippine Time (PHT)";

    const payload: PlatformCompanyFormData = {
      ...formData,
      company_id: company.company_id,
      values: finalValues,
      metadata: parsedMetadata,
      is_primary: 1,
      is_active: 1,
      display_order: 1,
    };

    await onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {validationError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="bg-card/70 border border-primary/10 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/40 rounded-2xl border border-border/40 gap-1">
            <TabsTrigger value="identity" className="text-xs rounded-xl gap-2 py-2.5">
              <Building2 className="h-3.5 w-3.5" /> Identity & Brand
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs rounded-xl gap-2 py-2.5">
              <Clock className="h-3.5 w-3.5" /> Support & Contact
            </TabsTrigger>
            <TabsTrigger value="story" className="text-xs rounded-xl gap-2 py-2.5">
              <FileText className="h-3.5 w-3.5" /> Story & Copy
            </TabsTrigger>
            <TabsTrigger value="values" className="text-xs rounded-xl gap-2 py-2.5">
              <HeartHandshake className="h-3.5 w-3.5" /> Core Values
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs rounded-xl gap-2 py-2.5">
              <Share2 className="h-3.5 w-3.5" /> Media & Social
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs rounded-xl gap-2 py-2.5">
              <Settings className="h-3.5 w-3.5" /> Metadata
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BRANDING & IDENTITY */}
          <TabsContent value="identity" className="space-y-5 m-0 pt-2">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" /> Platform Branding Header & Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Platform Brand Name</Label>
                  <Input
                    value={formData.platform_name || ""}
                    onChange={(e) => handleChange("platform_name", e.target.value)}
                    placeholder="e.g. VOS Sync"
                    className="rounded-xl h-10 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Displayed in top navigation header, footer brand, and page titles.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Platform Brand Icon</Label>
                    {isUploadedIcon(formData.platform_icon) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChange("platform_icon", "Briefcase");
                          toast.info("Reset brand icon to standard Briefcase.");
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset to standard
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isUploadedIcon(formData.platform_icon) ? (
                      <div className="h-10 w-10 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                        <Image
                          src={formatAssetUrl(formData.platform_icon) || formData.platform_icon!}
                          alt="Brand icon"
                          width={32}
                          height={32}
                          className="h-7 w-7 object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <Input
                        value={formData.platform_icon || ""}
                        onChange={(e) => handleChange("platform_icon", e.target.value)}
                        placeholder="e.g. Briefcase"
                        className="rounded-xl h-10 text-xs flex-1"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingBrandIcon}
                      onClick={() => brandIconInputRef.current?.click()}
                      className="rounded-xl h-10 px-3 text-xs gap-1.5 shrink-0"
                    >
                      {uploadingBrandIcon ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      {isUploadedIcon(formData.platform_icon) ? "Change Image" : "Upload Image"}
                    </Button>
                    <input
                      ref={brandIconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBrandIconUpload}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Custom uploaded image icon or Lucide name rendered in header brand and footer.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Company Display Name *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="e.g. Vertex Technologies Corporation"
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Legal Registered Business Name *</Label>
                <Input
                  value={formData.company_legal_name}
                  onChange={(e) => handleChange("company_legal_name", e.target.value)}
                  placeholder="Full legal entity name on corporate registrations"
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Company Code *</Label>
                <Input
                  value={formData.company_code}
                  onChange={(e) => handleChange("company_code", e.target.value)}
                  placeholder="e.g. VTC"
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Routing Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  placeholder="e.g. vertex-technologies"
                  className="rounded-xl h-10 text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Year Established</Label>
                <Input
                  type="number"
                  value={formData.year_established ?? ""}
                  onChange={(e) =>
                    handleChange("year_established", e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  placeholder="e.g. 2024"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hero Tagline / Punchy Slogan</Label>
              <Input
                value={formData.company_tagline || ""}
                onChange={(e) => handleChange("company_tagline", e.target.value)}
                placeholder="e.g. Where Lines Meet."
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Short Introduction</Label>
              <Textarea
                value={formData.company_short_description || ""}
                onChange={(e) => handleChange("company_short_description", e.target.value)}
                placeholder="Brief introductory summary powering landing page cards and search previews..."
                className="rounded-xl text-xs resize-none h-20"
              />
            </div>
          </TabsContent>

          {/* TAB 2: SUPPORT & CONTACT */}
          <TabsContent value="contact" className="space-y-5 m-0 pt-2">
            <div className="p-4 rounded-2xl bg-info/5 border border-info/20 space-y-4">
              <div className="flex items-center gap-2 text-info font-semibold text-xs uppercase tracking-wider">
                <Clock className="h-4 w-4" /> Customer Support Operating Hours (Contact Us Page)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Operating Days</Label>
                  <Input
                    value={formData.support_hours_days || ""}
                    onChange={(e) => handleChange("support_hours_days", e.target.value)}
                    placeholder="e.g. Mon–Fri"
                    className="rounded-xl h-10 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Days when support staff is active.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Daily Operating Hours</Label>
                  <Input
                    value={formData.support_hours_time || ""}
                    onChange={(e) => handleChange("support_hours_time", e.target.value)}
                    placeholder="e.g. 8am–5pm"
                    className="rounded-xl h-10 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Office hours window.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Timezone Designation</Label>
                  <Input
                    value={formData.support_hours_timezone || ""}
                    onChange={(e) => handleChange("support_hours_timezone", e.target.value)}
                    placeholder="e.g. Philippine Time (PHT)"
                    className="rounded-xl h-10 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Timezone descriptor for visitors.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">General Inquiries Email *</Label>
                <Input
                  type="email"
                  value={formData.company_email}
                  onChange={(e) => handleChange("company_email", e.target.value)}
                  placeholder="e.g. contact@vosync.com"
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Dedicated Customer Support Email</Label>
                <Input
                  type="email"
                  value={formData.support_email || ""}
                  onChange={(e) => handleChange("support_email", e.target.value)}
                  placeholder="e.g. support@vosync.com"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Primary Contact Phone / Mobile *</Label>
                <Input
                  value={formData.company_contact}
                  onChange={(e) => handleChange("company_contact", e.target.value)}
                  placeholder="e.g. +639451232521"
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Official Website</Label>
                <Input
                  value={formData.company_website || ""}
                  onChange={(e) => handleChange("company_website", e.target.value)}
                  placeholder="e.g. www.vosync.com"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Physical Street Address</Label>
              <Input
                value={formData.company_address || ""}
                onChange={(e) => handleChange("company_address", e.target.value)}
                placeholder="e.g. Gonzales Street"
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Barangay</Label>
                <Input
                  value={formData.company_brgy || ""}
                  onChange={(e) => handleChange("company_brgy", e.target.value)}
                  placeholder="e.g. Bonuan Boquig"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">City / Municipality</Label>
                <Input
                  value={formData.company_city || ""}
                  onChange={(e) => handleChange("company_city", e.target.value)}
                  placeholder="e.g. Dagupan"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Province / State</Label>
                <Input
                  value={formData.company_province || ""}
                  onChange={(e) => handleChange("company_province", e.target.value)}
                  placeholder="e.g. Pangasinan"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">ZIP Code</Label>
                <Input
                  value={formData.company_zipCode || ""}
                  onChange={(e) => handleChange("company_zipCode", e.target.value)}
                  placeholder="e.g. 2400"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">SEC / DTI Registration No.</Label>
                <Input
                  value={formData.registration_no || ""}
                  onChange={(e) => handleChange("registration_no", e.target.value)}
                  placeholder="Registration number"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tax Identification Number (TIN)</Label>
                <Input
                  value={formData.company_tin || ""}
                  onChange={(e) => handleChange("company_tin", e.target.value)}
                  placeholder="000-000-000-000"
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Google Maps Embed URL</Label>
              <Input
                value={formData.map_embed_url || ""}
                onChange={(e) => handleChange("map_embed_url", e.target.value)}
                placeholder="https://www.google.com/maps/embed?..."
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </TabsContent>

          {/* TAB 3: STORY & NARRATIVE */}
          <TabsContent value="story" className="space-y-5 m-0 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Comprehensive Company Narrative</Label>
              <Textarea
                value={formData.company_description || ""}
                onChange={(e) => handleChange("company_description", e.target.value)}
                placeholder="Detailed narrative detailing platform journey, scope, and background..."
                className="rounded-xl text-xs min-h-[90px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Mission Statement (About Us)</Label>
                <Textarea
                  value={formData.company_mission || ""}
                  onChange={(e) => handleChange("company_mission", e.target.value)}
                  placeholder="e.g. To connect people and opportunities through technology that inspires growth."
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Vision Statement (About Us)</Label>
                <Textarea
                  value={formData.company_vision || ""}
                  onChange={(e) => handleChange("company_vision", e.target.value)}
                  placeholder="e.g. A future where connections inspire progress and everyone has the opportunity to grow."
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Our Culture (About Us Highlight Card)</Label>
                  <span className="text-[10px] text-muted-foreground">Full text displayed without truncation</span>
                </div>
                <Textarea
                  value={formData.company_culture || ""}
                  onChange={(e) => handleChange("company_culture", e.target.value)}
                  placeholder="Workplace culture, principles, and team ethos..."
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Platform Benefits (About Us Highlight Card)</Label>
                  <span className="text-[10px] text-muted-foreground">Full text displayed without truncation</span>
                </div>
                <Textarea
                  value={formData.company_benefits || ""}
                  onChange={(e) => handleChange("company_benefits", e.target.value)}
                  placeholder="Key platform perks and organizational advantages..."
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mission Checkpoints & Badges (Comma-separated)</Label>
              <Input
                value={formData.company_tags || ""}
                onChange={(e) => handleChange("company_tags", e.target.value)}
                placeholder="Verified employers and authentic job listings, AI-assisted talent matching, Transparent salary ranges"
                className="rounded-xl h-10 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Items rendered as checkmarked bullet points under Our Mission on the About Us page.
              </p>
            </div>
          </TabsContent>

          {/* TAB 4: CORE VALUES (DYNAMIC CMS) */}
          <TabsContent value="values" className="space-y-5 m-0 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-primary" /> What Guides Our Work (Core Values)
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {valuesList.length} / {MAX_VALUES}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage up to 4 core value cards rendered on the About Us page grid.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddValue}
                disabled={isMaxValues}
                className="rounded-full bg-primary text-primary-foreground text-xs gap-1.5 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Plus className="h-3.5 w-3.5" /> {isMaxValues ? "Max 4 Reached" : "Add Value Card"}
              </Button>
            </div>

            <div className="space-y-4">
              {valuesList.map((val, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border border-primary/15 bg-card/90 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <span className="text-xs font-bold text-foreground">Value #{idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`val-active-${idx}`} className="text-xs text-muted-foreground cursor-pointer">
                          {val.is_active !== false ? "Active" : "Hidden"}
                        </Label>
                        <Switch
                          id={`val-active-${idx}`}
                          checked={val.is_active !== false}
                          onCheckedChange={(checked) => handleUpdateValue(idx, { is_active: checked })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveValue(idx)}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs font-medium">Title</Label>
                      <Input
                        value={val.title}
                        onChange={(e) => handleUpdateValue(idx, { title: e.target.value })}
                        placeholder="e.g. People First"
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Icon</Label>
                        {isUploadedIcon(val.icon_name || val.icon) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateValue(idx, {
                                icon_name: "HeartHandshake",
                                icon: "HeartHandshake",
                              });
                              toast.info("Reset icon to standard HeartHandshake.");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                          >
                            <RotateCcw className="h-2.5 w-2.5" /> Standard
                          </button>
                        )}
                      </div>

                      {isUploadedIcon(val.icon_name || val.icon) ? (
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-xl border border-primary/20 bg-muted/40 flex items-center justify-center overflow-hidden p-1 shrink-0">
                            <Image
                              src={
                                formatAssetUrl(val.icon_name || val.icon) ||
                                (val.icon_name || val.icon)!
                              }
                              alt={val.title}
                              width={28}
                              height={28}
                              className="h-7 w-7 object-contain"
                              unoptimized
                            />
                          </div>
                          <label className="flex-1 cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadValueIcon(idx, f);
                              }}
                            />
                            <div className="h-9 px-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-1.5 text-xs text-primary transition-colors">
                              {uploadingIdx === idx ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-3.5 w-3.5" />
                                  <span>Change Image</span>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={val.icon_name || val.icon || "HeartHandshake"}
                            onChange={(e) =>
                              handleUpdateValue(idx, {
                                icon_name: e.target.value,
                                icon: e.target.value,
                              })
                            }
                            className="flex-1 h-9 rounded-xl border border-primary/15 bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {AVAILABLE_ICONS.map((ic) => (
                              <option key={ic.value} value={ic.value}>
                                {ic.label}
                              </option>
                            ))}
                          </select>
                          <label className="cursor-pointer shrink-0">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadValueIcon(idx, f);
                              }}
                            />
                            <div
                              title="Upload custom image / icon"
                              className="h-9 px-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-1 text-xs text-primary transition-colors"
                            >
                              {uploadingIdx === idx ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <UploadCloud className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline text-[11px]">Upload</span>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs font-medium">Color Tone</Label>
                      <select
                        value={val.color || COLOR_THEMES[0].value}
                        onChange={(e) => handleUpdateValue(idx, { color: e.target.value })}
                        className="w-full h-9 rounded-xl border border-primary/15 bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {COLOR_THEMES.map((theme) => (
                          <option key={theme.label} value={theme.value}>
                            {theme.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Description</Label>
                    <Textarea
                      value={val.description || val.desc || ""}
                      onChange={(e) =>
                        handleUpdateValue(idx, {
                          description: e.target.value,
                          desc: e.target.value,
                        })
                      }
                      placeholder="Value impact narrative..."
                      className="rounded-xl text-xs min-h-[60px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 5: MEDIA & SOCIAL */}
          <TabsContent value="media" className="space-y-5 m-0 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Primary Logo Asset Path / URL</Label>
                <Input
                  value={formData.company_logo || ""}
                  onChange={(e) => handleChange("company_logo", e.target.value)}
                  placeholder="https://... or /logo.png"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Hero Banner / Cover Image URL</Label>
                <Input
                  value={formData.company_cover || ""}
                  onChange={(e) => handleChange("company_cover", e.target.value)}
                  placeholder="https://... or /cover.jpg"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs font-bold text-foreground">Official Social Media Profiles</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">LinkedIn</Label>
                  <Input
                    value={formData.company_linkedin || ""}
                    onChange={(e) => handleChange("company_linkedin", e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Facebook</Label>
                  <Input
                    value={formData.company_facebook || ""}
                    onChange={(e) => handleChange("company_facebook", e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Instagram</Label>
                  <Input
                    value={formData.company_instagram || ""}
                    onChange={(e) => handleChange("company_instagram", e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">X / Twitter</Label>
                  <Input
                    value={formData.company_x || ""}
                    onChange={(e) => handleChange("company_x", e.target.value)}
                    placeholder="https://x.com/..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">YouTube</Label>
                  <Input
                    value={formData.company_youtube || ""}
                    onChange={(e) => handleChange("company_youtube", e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 6: METADATA */}
          <TabsContent value="settings" className="space-y-4 m-0 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Raw Extensible JSON Metadata</Label>
                <span className="text-[11px] text-muted-foreground font-mono">JSON format</span>
              </div>
              <Textarea
                value={metadataJsonText}
                onChange={(e) => setMetadataJsonText(e.target.value)}
                placeholder='{\n  "stats": [\n    { "label": "Talent Community", "value": "20,000+" }\n  ]\n}'
                className="font-mono text-xs min-h-[220px] rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Directly stores customizable metrics (stats, milestones, SEO attributes). Core Values and Support Hours are automatically synchronized here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-card/80 border border-primary/10 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Updates immediately power landing pages, About Us, and Contact sections.</span>
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-primary to-info text-primary-foreground font-semibold px-6 shadow-md hover:brightness-110"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save Platform Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
