"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  FileCheck2,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  Download,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileText,
  Briefcase,
  Users,
  CalendarDays,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Info,
  Maximize2,
  X,
} from "lucide-react";
import { CompanyVerificationRecord } from "../types";
import { VerificationStatusBadge } from "./VerificationStatusBadge";
import { formatDate } from "../utils/companyVerification.utils";

interface CompanyVerificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyVerificationRecord | null;
  onApprove: (company: CompanyVerificationRecord) => void;
  onRequestCorrection: (company: CompanyVerificationRecord) => void;
  onReject: (company: CompanyVerificationRecord) => void;
  isSubmitting: boolean;
}

function formatUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const t = url.trim();
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
}

export const CompanyVerificationDetailModal: React.FC<CompanyVerificationDetailModalProps> = ({
  isOpen,
  onClose,
  company,
  onApprove,
  onRequestCorrection,
  onReject,
  isSubmitting,
}) => {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; type: "logo" | "cover" } | null>(null);
  const [lastImage, setLastImage] = useState<{ url: string; title: string; type: "logo" | "cover" } | null>(null);

  const openPreview = (img: { url: string; title: string; type: "logo" | "cover" }) => {
    setLastImage(img);
    setPreviewImage(img);
  };

  const currentImg = previewImage || lastImage;

  if (!company) return null;

  const primaryOwner = company.users?.find((u) => u.is_primary_contact || u.company_user_role === "OWNER");
  const verifications = company.verifications || [];

  const addressParts = [
    company.company_address,
    company.company_brgy,
    company.company_city,
    company.company_province,
    company.company_zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const hasSocials =
    company.company_facebook ||
    company.company_linkedin ||
    company.company_instagram ||
    company.company_x ||
    company.company_youtube;

  const initials = company.company_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "CO";

  // Resolve cover photo URL
  const coverPhoto =
    company.company_cover ||
    (company as unknown as Record<string, unknown>).company_cover_photo ||
    (company as unknown as Record<string, unknown>).company_cover_image;

  const coverUrl = coverPhoto
    ? String(coverPhoto).startsWith("http") || String(coverPhoto).startsWith("/")
      ? String(coverPhoto)
      : `/assets/${coverPhoto}`
    : null;

  // Resolve logo URL
  const logoUrl = company.company_logo
    ? String(company.company_logo).startsWith("http") || String(company.company_logo).startsWith("/")
      ? String(company.company_logo)
      : `/assets/${company.company_logo}`
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="!max-w-6xl w-[92vw] h-[88vh] max-h-[92vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="h-5 w-5 text-primary" />
                  {company.company_name}
                  <VerificationStatusBadge

                    status={company.verification_status}
                    workflowStatus={company.latest_verification?.status}
                  />

                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span>Code: <strong className="font-mono">{company.company_code}</strong></span>
                  <span>•</span>
                  <span>Submitted: {formatDate(company.submitted_at || company.created_at)}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Tabbed Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="profile" className="gap-2 text-xs font-semibold">
                  <Building2 className="h-3.5 w-3.5" />
                  Company Profile
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2 text-xs font-semibold">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Documents ({company.documents?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-2 text-xs font-semibold">
                  <UserCheck className="h-3.5 w-3.5" />
                  Contacts & Owners
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verification Logs ({verifications.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: PROFILE */}
              <TabsContent value="profile" className="space-y-6 text-xs outline-none">
                {/* Cover Banner + Overlaid Logo */}
                <div className="relative rounded-2xl overflow-hidden border bg-card shadow-sm">
                  {/* Cover Photo */}
                  <div
                    onClick={() => {
                      if (coverUrl) openPreview({ url: coverUrl, title: `${company.company_name} - Cover Banner`, type: "cover" });
                    }}
                    className={`h-44 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 overflow-hidden relative group ${coverUrl ? "cursor-pointer" : ""
                      }`}
                  >
                    {coverUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverUrl}
                          alt="Company Cover"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <Maximize2 className="h-4 w-4" /> Click to Expand Cover
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-slate-400">No cover banner uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Overlaid Avatar Logo */}
                  <div className="px-6 pb-5 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex items-end gap-4 -mt-10 relative z-10">
                      <div
                        onClick={() => {
                          if (logoUrl) openPreview({ url: logoUrl, title: `${company.company_name} - Profile Logo`, type: "logo" });
                        }}
                        className={`h-20 w-20 rounded-2xl border-4 border-background bg-card shadow-md overflow-hidden flex items-center justify-center shrink-0 group relative ${logoUrl ? "cursor-pointer" : ""
                          }`}
                      >
                        {logoUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logoUrl}
                              alt={company.company_name}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                              <Maximize2 className="h-3.5 w-3.5" />
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5 mb-1">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                          {company.company_name}
                          {company.is_public === 1 && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1.5 py-0">
                              Public Profile Active
                            </Badge>
                          )}
                        </h2>
                        {company.company_legal_name && (
                          <p className="text-xs text-muted-foreground">Legal: {company.company_legal_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Profile Completion Badge */}
                    <div className="flex items-center gap-3 mb-1">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Profile Completion</span>
                        <span className="text-sm font-bold text-foreground font-mono">{company.profile_completion_percent}%</span>
                      </div>
                      <div className="w-20 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, company.profile_completion_percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Tags */}
                  {company.company_tags && (
                    <div className="px-6 pb-4 flex flex-wrap gap-1.5 border-t pt-3 bg-muted/20">
                      {company.company_tags.split(",").map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[11px] font-medium px-2 py-0.5">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Legal & Identification Box */}
                  <div className="bg-card border rounded-xl p-5 space-y-3.5 shadow-2xs">
                    <h4 className="font-bold text-foreground flex items-center gap-2 border-b pb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Building2 className="h-4 w-4 text-primary" />
                      Corporate & Registration Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">
                          Company Display Name
                        </span>
                        <span className="font-semibold text-foreground">{company.company_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">
                          Legal Business Name
                        </span>
                        <span className="font-semibold text-foreground">{company.company_legal_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">
                          TIN (Tax Identification)
                        </span>
                        <span className="font-mono text-foreground font-medium">{company.company_tin || "Not Provided"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">
                          Registration No (SEC / DTI)
                        </span>
                        <span className="font-mono text-foreground font-medium">{company.registration_no || "Not Provided"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-muted-foreground" /> Industry
                        </span>
                        <span className="font-medium text-foreground">
                          {company.industry_id ? `Industry #${company.industry_id}` : "Not Specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" /> Company Size
                        </span>
                        <span className="font-medium text-foreground">
                          {company.company_size_id ? `Size #${company.company_size_id}` : "Not Specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" /> Year Established
                        </span>
                        <span className="font-medium text-foreground font-mono">
                          {company.year_established || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">
                          Organization Type
                        </span>
                        <span className="font-medium text-foreground">
                          {company.organization_type_id ? `Type #${company.organization_type_id}` : "Standard Corp"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Address Box */}
                  <div className="bg-card border rounded-xl p-5 space-y-3.5 shadow-2xs">
                    <h4 className="font-bold text-foreground flex items-center gap-2 border-b pb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      Contact & Online Presence
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-foreground">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Company Email</span>
                          <a href={`mailto:${company.company_email}`} className="font-medium text-primary hover:underline">
                            {company.company_email}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-foreground">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Phone className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Phone Contact</span>
                          <span className="font-medium">{company.company_contact}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-foreground">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Registered Business Address</span>
                          <span className="font-medium leading-relaxed">{addressParts || "No address specified."}</span>
                        </div>
                      </div>

                      {company.company_website && (
                        <div className="flex items-center gap-2.5 text-foreground">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Globe className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Official Website</span>
                            <a
                              href={formatUrl(company.company_website)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              {company.company_website}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                {hasSocials && (
                  <div className="bg-card border rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                      Social Media & External Profiles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {company.company_facebook && (
                        <a
                          href={formatUrl(company.company_facebook)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <Facebook className="h-3.5 w-3.5 text-blue-600" />
                          Facebook
                        </a>
                      )}
                      {company.company_linkedin && (
                        <a
                          href={formatUrl(company.company_linkedin)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <Linkedin className="h-3.5 w-3.5 text-blue-700" />
                          LinkedIn
                        </a>
                      )}
                      {company.company_instagram && (
                        <a
                          href={formatUrl(company.company_instagram)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <Instagram className="h-3.5 w-3.5 text-pink-600" />
                          Instagram
                        </a>
                      )}
                      {company.company_youtube && (
                        <a
                          href={formatUrl(company.company_youtube)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <Youtube className="h-3.5 w-3.5 text-red-600" />
                          YouTube
                        </a>
                      )}
                      {company.company_x && (
                        <a
                          href={formatUrl(company.company_x)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <span className="font-bold text-xs">𝕏</span>
                          X (Twitter)
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Company Description / About Us */}
                {company.company_description && (
                  <div className="bg-card border rounded-xl p-5 space-y-2">
                    <h4 className="font-bold text-foreground flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Info className="h-4 w-4 text-primary" />
                      Company Overview & Description
                    </h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {company.company_description}
                    </p>
                  </div>
                )}

                {/* Internal Notes & Rejection Guidance */}
                {company.internal_notes && (
                  <div className="bg-muted/40 border rounded-xl p-4 space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" />
                      Internal Admin Reviewer Notes
                    </span>
                    <p className="text-muted-foreground">{company.internal_notes}</p>
                  </div>
                )}

                {company.rejection_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-1">
                    <span className="font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Public Applicant Guidance / Rejection Reason
                    </span>
                    <p className="text-muted-foreground">{company.rejection_reason}</p>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: DOCUMENTS */}
              <TabsContent value="documents" className="space-y-3 text-xs outline-none">
                {!company.documents || company.documents.length === 0 ? (
                  <div className="border border-dashed rounded-xl p-8 text-center text-muted-foreground">
                    No company verification documents attached to this submission.
                  </div>
                ) : (
                  company.documents.map((doc) => (
                    <div key={doc.company_document_id} className="flex items-center justify-between border rounded-xl p-4 bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                          <FileCheck2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{doc.document_name}</div>
                          <div className="text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">{doc.document_type}</Badge>
                            <span>•</span>
                            <span>Uploaded: {formatDate(doc.uploaded_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/assets/${doc.directus_file_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Preview
                        </a>
                        <a
                          href={`/assets/${doc.directus_file_id}?download`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* TAB 3: CONTACTS & OWNERS */}
              <TabsContent value="contact" className="space-y-4 text-xs outline-none">
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-foreground flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Primary Account Holder / Submitter
                  </h4>
                  {primaryOwner ? (
                    <div className="grid grid-cols-2 gap-3 text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Full Name</span>
                        <span className="font-semibold text-foreground text-sm">
                          {primaryOwner.user_fname} {primaryOwner.user_lname}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Email Address</span>
                        <span className="font-semibold text-foreground text-sm">{primaryOwner.user_email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Company Role</span>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{primaryOwner.company_user_role}</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No primary owner account linked.</div>
                  )}
                </div>

                {/* All Associated Team Members */}
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                    All Associated Company Members ({company.users?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {company.users?.map((u) => (
                      <div key={u.company_user_id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                        <div>
                          <div className="font-bold text-foreground">
                            {u.user_fname} {u.user_lname} {u.is_primary_contact ? "(Primary)" : ""}
                          </div>
                          <div className="text-muted-foreground text-[11px]">{u.user_email}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{u.company_user_role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: VERIFICATION LOGS */}
              <TabsContent value="history" className="space-y-3 text-xs outline-none">
                {verifications.length === 0 ? (
                  <div className="border border-dashed rounded-xl p-8 text-center text-muted-foreground">
                    No historical review decisions logged yet.
                  </div>
                ) : (
                  verifications.map((v) => (
                    <div key={v.id} className="border rounded-xl p-4 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <VerificationStatusBadge status={v.status} />
                          <span className="text-muted-foreground text-[11px]">Type: {v.verification_type}</span>
                        </div>
                        <span className="text-muted-foreground text-[11px]">{formatDate(v.created_at)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t">
                        <div>Reviewer: <strong className="text-foreground">{v.reviewer_name || `Admin #${v.reviewed_by}`}</strong></div>
                        <div>Submitted By: <strong className="text-foreground">{v.submitter_name || `User #${v.submitted_by_user_id}`}</strong></div>
                      </div>

                      {v.public_rejection_reason && (
                        <div className="bg-destructive/10 p-2.5 rounded border border-destructive/20 text-destructive mt-1">
                          <strong>Public Guidance:</strong> {v.public_rejection_reason}
                        </div>
                      )}
                      {v.internal_notes && (
                        <div className="bg-muted p-2.5 rounded border text-muted-foreground mt-1">
                          <strong>Internal Notes:</strong> {v.internal_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-muted-foreground">
              Target Company ID: <strong className="font-mono">{company.company_id}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestCorrection(company)}
                disabled={isSubmitting}
                className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 gap-1 text-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Request Correction
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReject(company)}
                disabled={isSubmitting}
                className="gap-1 text-xs font-semibold"
              >
                Reject
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onApprove(company)}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-semibold"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve Verification
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expanded Lightbox Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent
          className={`p-0 flex flex-col overflow-hidden bg-card border rounded-2xl shadow-2xl [&>button]:hidden ${currentImg?.type === "logo" ? "sm:max-w-md w-[90vw]" : "sm:max-w-4xl w-[92vw]"
            }`}
        >
          <div className="px-5 py-3 flex items-center justify-between border-b bg-muted/40 shrink-0">
            <span className="text-xs font-bold tracking-tight text-foreground truncate">{currentImg?.title}</span>
            <div className="flex items-center gap-2">
              {currentImg?.url && (
                <a
                  href={currentImg.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-background text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                  title="Download full image"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center bg-muted/10 overflow-hidden">
            {currentImg && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentImg.url}
                alt={currentImg.title}
                className={`object-contain rounded-xl shadow-md border bg-background ${currentImg.type === "logo" ? "max-h-[320px] max-w-[320px]" : "max-h-[60vh] max-w-full"
                  }`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
