/* eslint-disable @next/next/no-img-element */
// src/modules/freelancer/freelancer-applications/components/CompanyPreviewModal.tsx
"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Users,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { CompanyProfile } from "../types";

interface CompanyPreviewModalProps {
  open: boolean;
  onClose: () => void;
  company: CompanyProfile | null;
}

function getImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  return `/api/client/assets/${value}`;
}

function formatUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const t = url.trim();
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CompanyPreviewModal({
  open,
  onClose,
  company,
}: CompanyPreviewModalProps) {
  if (!company) return null;

  const addressParts = [
    company.company_address,
    company.company_brgy,
    company.company_city,
    company.company_province,
    company.company_zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-1/2 p-0 overflow-y-auto flex flex-col gap-0 z-[100]"
      >
        {/* Cover + Logo Header */}
        <div className="relative shrink-0">
          <div className="h-36 w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 overflow-hidden">
            {company.company_cover ? (
              <img
                src={getImageUrl(company.company_cover)}
                alt="Company Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-zinc-400">No cover photo</span>
              </div>
            )}
          </div>
          {/* Logo */}
          <div className="absolute -bottom-5 left-6 h-16 w-16 rounded-xl border-2 border-white dark:border-zinc-900 bg-white dark:bg-zinc-900 shadow-md overflow-hidden flex items-center justify-center z-10">
            {company.company_logo ? (
              <img
                src={getImageUrl(company.company_logo)}
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="h-7 w-7 text-zinc-400" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pt-10 pb-8 space-y-6">
          <SheetHeader className="text-left space-y-1 pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                  {company.company_name || "—"}
                </SheetTitle>
                {company.company_legal_name &&
                  company.company_legal_name !== company.company_name && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {company.company_legal_name}
                    </p>
                  )}
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 text-xs font-semibold shrink-0">
                Public Profile
              </Badge>
            </div>
          </SheetHeader>

          {/* Tags / Classification */}
          <div className="flex flex-wrap gap-2">
            {company.company_tags
              ? company.company_tags.split(",").map((tag, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs font-medium px-2.5 py-1 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  >
                    {tag.trim()}
                  </Badge>
                ))
              : null}
          </div>

          {/* About */}
          {company.company_description && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                About
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {company.company_description}
              </p>
            </div>
          )}

          {/* Key Details */}
          <div className="space-y-3 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Company Details
            </p>
            <div className="space-y-2.5">
              <InfoRow
                icon={Briefcase}
                label="Industry"
                value={company.industry_id ? `Industry #${company.industry_id}` : null}
              />
              <InfoRow
                icon={Users}
                label="Company Size"
                value={
                  company.company_size_id
                    ? `Size #${company.company_size_id}`
                    : null
                }
              />
              <InfoRow
                icon={CalendarDays}
                label="Year Established"
                value={
                  company.year_established
                    ? String(company.year_established)
                    : null
                }
              />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={addressParts || null}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Contact Information
            </p>
            <div className="space-y-2.5">
              <InfoRow
                icon={Mail}
                label="Email"
                value={company.company_email}
                href={`mailto:${company.company_email}`}
              />
              <InfoRow icon={Phone} label="Phone" value={company.company_contact} />
              <InfoRow
                icon={Globe}
                label="Website"
                value={company.company_website}
                href={formatUrl(company.company_website)}
              />
            </div>
          </div>

          {/* Socials */}
          {(company.company_facebook || company.company_linkedin || company.company_instagram || company.company_x || company.company_youtube) && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                Social Media
              </p>
              <div className="flex flex-wrap gap-2">
                {company.company_facebook && (
                  <a
                    href={formatUrl(company.company_facebook)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {company.company_linkedin && (
                  <a
                    href={formatUrl(company.company_linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {company.company_instagram && (
                  <a
                    href={formatUrl(company.company_instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {company.company_youtube && (
                  <a
                    href={formatUrl(company.company_youtube)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
