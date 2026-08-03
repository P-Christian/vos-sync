"use client";

import Image from "next/image";
import { useState } from "react";
import { Globe, MapPin, Share2, CheckCircle2, Check } from "lucide-react";
import { PublicCompanyProfile } from "../types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface HeaderProps {
  company: PublicCompanyProfile;
  onTabChange?: (tab: string) => void;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CompanyHeader({ company, onTabChange }: HeaderProps) {
  const {
    company_name,
    industry_name,
    company_size_name,
    company_logo,
    company_cover,
    company_website,
    company_address,
    verification_status,
    activeJobsCount,
  } = company;

  const [copied, setCopied] = useState(false);
  const verified = verification_status === "VERIFIED";

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Company profile link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-card border-b border-border font-sans">
      {/* Cover Image Banner */}
      <div className="relative h-48 md:h-72 w-full bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 overflow-hidden">
        {company_cover ? (
          <Image
            src={company_cover}
            alt={`${company_name} cover`}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100/50 via-background to-background dark:from-zinc-900/30" />
        )}
      </div>

      {/* Main Stats Overlay Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 relative z-10 -mt-16 md:-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Logo overlay & details */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
            {/* Logo box */}
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-3xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-4xl font-bold overflow-hidden shrink-0">
              {company_logo ? (
                <Image
                  src={company_logo}
                  alt={company_name}
                  width={144}
                  height={144}
                  className="object-cover w-full h-full"
                  priority
                  unoptimized
                />
              ) : (
                <span className="text-zinc-600 dark:text-zinc-300">
                  {getInitials(company_name)}
                </span>
              )}
            </div>

            {/* Title & Stats description */}
            <div className="md:mb-2">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight">
                  {company_name}
                </h1>
                {verified && (
                  <span title="Verified Employer">
                    <CheckCircle2
                      className="w-5 h-5 text-blue-500 fill-blue-50 dark:fill-blue-950/40 shrink-0"
                    />
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:text-base text-muted-foreground font-medium">
                <span>{industry_name || "General Business"}</span>
                <span>•</span>
                <span>{company_size_name || "Unknown Size"}</span>
                {company_address && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      {company_address.split(",")[0]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 md:mb-2 w-full md:w-auto shrink-0">
            {/* Share action */}
            <Button
              variant="outline"
              size="default"
              onClick={handleShare}
              className="rounded-xl flex items-center gap-2 font-semibold cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copied" : "Share"}
            </Button>

            {/* Visit Website action */}
            {company_website && (
              <Button
                variant="outline"
                size="default"
                className="rounded-xl font-semibold cursor-pointer shrink-0"
                asChild
              >
                <a href={company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              </Button>
            )}

            {/* View Open Jobs primary action */}
            {activeJobsCount > 0 ? (
              <Button
                size="default"
                className="rounded-xl font-semibold shadow-sm cursor-pointer shrink-0"
                onClick={() => onTabChange?.("jobs")}
              >
                View {activeJobsCount} Open Jobs
              </Button>
            ) : (
              <Button
                size="default"
                variant="outline"
                className="rounded-xl font-semibold opacity-60 cursor-not-allowed shrink-0"
                disabled
              >
                No Open Positions
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
