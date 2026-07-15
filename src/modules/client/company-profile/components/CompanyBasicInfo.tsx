// src/modules/client/company-profile/components/CompanyBasicInfo.tsx
"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditableCompanyFields } from "../types";
import { Facebook, Linkedin, Instagram, Youtube, Upload, Image as ImageIcon, Loader2, Building2 } from "lucide-react";

interface CompanyBasicInfoProps {
  data: Partial<EditableCompanyFields>;
  onChange: (field: keyof EditableCompanyFields, value: string) => void;
  readOnly?: boolean;
}

function getImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return `/api/client/assets/${value}`;
}

function formatWebsiteUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function extractSocialHandle(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim().replace(/\/$/, "");
  const lastSlashIndex = trimmed.lastIndexOf("/");
  if (lastSlashIndex !== -1) {
    const segment = trimmed.substring(lastSlashIndex + 1);
    return `/${segment}`;
  }
  return `/${trimmed}`;
}

export default function CompanyBasicInfo({
  data,
  onChange,
  readOnly = false,
}: CompanyBasicInfoProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "company_logo" | "company_cover") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "company_logo") setUploadingLogo(true);
    else setUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadedFile = await res.json();
      onChange(field, uploadedFile.id);
    } catch (err) {
      console.error(err);
      alert("Failed to upload image. Please try again.");
    } finally {
      if (field === "company_logo") setUploadingLogo(false);
      else setUploadingCover(false);
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
            <span className="inline-block w-1 h-4 bg-primary rounded-full" />
            Company Information
          </h3>

          {/* Banner & Logo Visualizer (Read Only) */}
          <div className="relative mb-14">
            {/* Cover image container */}
            <div className="group h-80 w-full bg-linear-to-r from-emerald-500/10 to-teal-500/10 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
              {data.company_cover ? (
                <img
                  src={getImageUrl(data.company_cover)}
                  alt="Company Cover"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs">
                  No cover photo uploaded
                </div>
              )}
            </div>
            {/* Logo overlay - positioned absolutely, half-overlapping the bottom border */}
            <div className="absolute -bottom-4 left-6 h-25 w-25 rounded-xl border-2 border-white dark:border-zinc-950 bg-white dark:bg-zinc-900 shadow-md overflow-hidden flex items-center justify-center z-10 transition-transform duration-300 ease-out hover:scale-105 hover:shadow-lg">
              {data.company_logo ? (
                <img
                  src={getImageUrl(data.company_logo)}
                  alt="Company Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-9 w-9 text-zinc-400" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Display Name</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.company_name || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Legal Company Name</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.company_legal_name || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Email</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.company_email || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Contact</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.company_contact || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Registration Number</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.registration_no || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">TIN</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{data.company_tin || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Website</span>
              {data.company_website ? (
                <a href={formatWebsiteUrl(data.company_website)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline block truncate max-w-xs">
                  {data.company_website}
                </a>
              ) : (
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">—</p>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Social Media Links</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                {data.company_facebook && (
                  <a href={formatWebsiteUrl(data.company_facebook)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:underline truncate">
                    <Facebook className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-[13px] truncate">{extractSocialHandle(data.company_facebook)}</span>
                  </a>
                )}
                {data.company_linkedin && (
                  <a href={formatWebsiteUrl(data.company_linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:underline truncate">
                    <Linkedin className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-[13px] truncate">{extractSocialHandle(data.company_linkedin)}</span>
                  </a>
                )}
                {data.company_instagram && (
                  <a href={formatWebsiteUrl(data.company_instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:underline truncate">
                    <Instagram className="h-3.5 w-3.5 text-pink-600 shrink-0" />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-[13px] truncate">{extractSocialHandle(data.company_instagram)}</span>
                  </a>
                )}
                {data.company_youtube && (
                  <a href={formatWebsiteUrl(data.company_youtube)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:underline truncate">
                    <Youtube className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-[13px] truncate">{extractSocialHandle(data.company_youtube)}</span>
                  </a>
                )}
                {data.company_x && (
                  <a href={formatWebsiteUrl(data.company_x)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:underline truncate">
                    <span className="h-3.5 w-3.5 flex items-center justify-center font-bold text-zinc-900 dark:text-zinc-100 text-xs shrink-0 select-none">𝕏</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 text-[13px] truncate">{extractSocialHandle(data.company_x)}</span>
                  </a>
                )}
                {!data.company_facebook && !data.company_linkedin && !data.company_instagram && !data.company_youtube && !data.company_x && (
                  <p className="text-xs text-zinc-400 col-span-2">—</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Description</span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">{data.company_description || "No description provided."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-primary rounded-full" />
          Basic Information
        </h3>

        {/* Banner & Logo Visualizer (Edit Mode with Hovers) */}
        <div className="relative mb-14">
          {/* Cover image editor */}
          <div 
            onClick={() => coverInputRef.current?.click()}
            className="group h-80 w-full bg-linear-to-r from-emerald-500/10 to-teal-500/10 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all hover:brightness-95"
          >
            {data.company_cover ? (
              <img
                src={getImageUrl(data.company_cover)}
                alt="Company Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs">
                <ImageIcon className="h-6 w-6 mb-1 text-zinc-400 group-hover:scale-105 transition-transform" />
                Upload Cover Photo
              </div>
            )}
            
            {/* Hover overlay for cover */}
            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5">
                {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Change Cover Photo
              </div>
            </div>
            
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "company_cover")}
            />
          </div>

          {/* Logo overlay editor */}
          <div 
            onClick={() => logoInputRef.current?.click()}
            className="group absolute -bottom-4 left-6 h-25 w-25  rounded-xl border-2 border-white dark:border-zinc-950 bg-white dark:bg-zinc-900 shadow-md overflow-hidden flex items-center justify-center cursor-pointer z-10 transition-transform hover:scale-102"
          >
            {data.company_logo ? (
              <img
                src={getImageUrl(data.company_logo)}
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="h-9 w-9 text-zinc-400 group-hover:scale-105 transition-transform" />
            )}

            {/* Hover overlay for logo */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingLogo ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Upload className="h-5 w-5 text-zinc-800 dark:text-white" />
              )}
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "company_logo")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-company-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Display Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cp-company-name"
              value={data.company_name ?? ""}
              onChange={(e) => onChange("company_name", e.target.value)}
              placeholder="e.g. Vertex Technologies"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-company-legal-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Legal Company Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cp-company-legal-name"
              value={data.company_legal_name ?? ""}
              onChange={(e) => onChange("company_legal_name", e.target.value)}
              placeholder="e.g. Vertex Technologies Corporation"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-company-email" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cp-company-email"
              type="email"
              value={data.company_email ?? ""}
              onChange={(e) => onChange("company_email", e.target.value)}
              placeholder="hr@company.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-company-contact" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Contact <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cp-company-contact"
              value={data.company_contact ?? ""}
              onChange={(e) => onChange("company_contact", e.target.value)}
              placeholder="09XX-XXX-XXXX"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-registration-number" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Registration Number
            </Label>
            <Input
              id="cp-registration-number"
              value={data.registration_no ?? ""}
              onChange={(e) => onChange("registration_no", e.target.value)}
              placeholder="e.g. SEC-123456"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-tin" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              TIN
            </Label>
            <Input
              id="cp-tin"
              value={data.company_tin ?? ""}
              onChange={(e) => onChange("company_tin", e.target.value)}
              placeholder="e.g. 000-123-456-000"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="cp-company-website" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company Website
            </Label>
            <Input
              id="cp-company-website"
              value={data.company_website ?? ""}
              onChange={(e) => onChange("company_website", e.target.value)}
              placeholder="https://company.com"
              className="h-9 text-sm"
            />
          </div>

          {/* Hidden inputs to keep state updated, but represented visually above */}
          <input type="hidden" value={data.company_logo ?? ""} />
          <input type="hidden" value={data.company_cover ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cp-company-description" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Company Description <span className="text-rose-500">*</span>
        </Label>
        <Textarea
          id="cp-company-description"
          value={data.company_description ?? ""}
          onChange={(e) => onChange("company_description", e.target.value)}
          rows={4}
          placeholder="Tell job seekers about your company, culture, and mission..."
          className="resize-none text-sm leading-relaxed"
        />
      </div>

      {/* Social Media Links Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Social Media Links</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-facebook" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Facebook URL</Label>
            <Input
              id="cp-facebook"
              value={data.company_facebook ?? ""}
              onChange={(e) => onChange("company_facebook", e.target.value)}
              placeholder="https://facebook.com/username"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-linkedin" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">LinkedIn URL</Label>
            <Input
              id="cp-linkedin"
              value={data.company_linkedin ?? ""}
              onChange={(e) => onChange("company_linkedin", e.target.value)}
              placeholder="https://linkedin.com/company/username"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-instagram" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Instagram URL</Label>
            <Input
              id="cp-instagram"
              value={data.company_instagram ?? ""}
              onChange={(e) => onChange("company_instagram", e.target.value)}
              placeholder="https://instagram.com/username"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-youtube" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">YouTube URL</Label>
            <Input
              id="cp-youtube"
              value={data.company_youtube ?? ""}
              onChange={(e) => onChange("company_youtube", e.target.value)}
              placeholder="https://youtube.com/channel/username"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="cp-x" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">𝕏 (Twitter) URL</Label>
            <Input
              id="cp-x"
              value={data.company_x ?? ""}
              onChange={(e) => onChange("company_x", e.target.value)}
              placeholder="https://x.com/username"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
