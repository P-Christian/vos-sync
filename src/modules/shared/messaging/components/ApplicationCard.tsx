"use client";

// src/modules/shared/messaging/components/ApplicationCard.tsx

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Briefcase,
  CalendarDays,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  Phone,
  UserRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Message } from "@/modules/client/messaging/types";

interface ApplicationCardData {
  event_type: string;
  application_id: number;
  application_status: string;
  applied_at: string | null;
  expected_salary: number | null;
  cover_letter?: string | null;
  portfolio_url?: string | null;
  applicant_name: string;
  applicant_avatar: string | null;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  job_title: string;
  salary_min: number | null;
  salary_max: number | null;
  resume?: { file_name: string; file_path: string } | null;
  social_links?: Array<{ platform_name: string; url: string }>;
}

interface Props {
  message: Message;
}

const EVENT_HEADERS: Record<string, { icon: string; label: string; accent: string }> = {
  APPLICATION_SUBMITTED: {
    icon: "📋",
    label: "New Application",
    accent: "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40",
  },
  APPLICATION_STATUS_CHANGED: {
    icon: "🔄",
    label: "Application Updated",
    accent: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40",
  },
  HIRED: {
    icon: "🎉",
    label: "Candidate Hired",
    accent: "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40",
  },
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  SHORTLISTED: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
  INTERVIEW_SCHEDULED: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
  HIRED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `₱${(n / 1000).toFixed(0)}k` : `₱${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export default function ApplicationCard({ message }: Props) {
  const [data, setData] = useState<ApplicationCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/messaging/system-card?message_id=${message.message_id}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [message.message_id]);

  const eventType = message.system_message?.event_type ?? "APPLICATION_SUBMITTED";
  const meta = EVENT_HEADERS[eventType] ?? EVENT_HEADERS["APPLICATION_SUBMITTED"];

  if (loading) {
    return (
      <div className={`w-full max-w-sm rounded-2xl border p-4 ${meta.accent} flex items-center gap-3 shadow-sm`}>
        <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
        <span className="text-xs text-zinc-400">Loading details...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`w-full max-w-sm rounded-2xl border p-4 ${meta.accent}`}>
        <p className="text-xs text-zinc-500">{meta.icon} {meta.label}</p>
      </div>
    );
  }

  const salary = formatSalary(data.salary_min, data.salary_max);
  const statusColor = STATUS_COLORS[data.application_status] ?? "bg-zinc-100 text-zinc-600";
  const hasCoverLetter = Boolean(data.cover_letter?.trim());
  const hasSocials = Boolean(data.social_links && data.social_links.length > 0);
  const hasResume = Boolean(data.resume?.file_path);
  const hasPortfolio = Boolean(data.portfolio_url?.trim());

  return (
    <div className={`w-full max-w-sm sm:max-w-md rounded-2xl border shadow-sm overflow-hidden ${meta.accent}`}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-inherit flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {meta.label}
          </span>
        </div>
        {data.applied_at && (
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {formatDate(data.applied_at)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5">
        {/* Applicant Header */}
        <div className="flex items-center gap-3">
          {data.applicant_avatar && !imgError ? (
            <Image
              src={data.applicant_avatar}
              alt={data.applicant_name}
              width={44}
              height={44}
              onError={() => setImgError(true)}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shrink-0"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <UserRound className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {data.applicant_name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Briefcase className="h-3 w-3 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {data.job_title}
              </span>
            </div>
          </div>
        </div>

        {/* Status + Salary Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>
            {data.application_status}
          </span>
          {salary && (
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-700/50">
              {salary}
            </span>
          )}
        </div>

        {/* Contact Info (Email & Phone) */}
        {(data.applicant_email || data.applicant_phone) && (
          <div className="pt-2 border-inherit/60 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            {data.applicant_email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <a href={`mailto:${data.applicant_email}`} className="truncate hover:underline text-indigo-600 dark:text-indigo-400">
                  {data.applicant_email}
                </a>
              </div>
            )}
            {data.applicant_phone && (
              <div className="flex items-center gap-2 truncate">
                <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{data.applicant_phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Attachments / Links Row (Resume, Portfolio, Socials) */}
        {(hasResume || hasPortfolio || hasSocials) && (
          <div className="pt-2  border-inherit/60 flex items-center gap-2 flex-wrap">
            {hasResume && data.resume && (
              <a
                href={data.resume.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition"
              >
                <FileText className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="truncate max-w-[120px]">{data.resume.file_name}</span>
                <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
              </a>
            )}

            {hasPortfolio && (
              <a
                href={data.portfolio_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition"
              >
                <Globe className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>Portfolio</span>
                <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
              </a>
            )}

            {hasSocials &&
              data.social_links?.map((social, idx) => (
                <a
                  key={idx}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition"
                >
                  <span className="capitalize">{social.platform_name}</span>
                  <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                </a>
              ))}
          </div>
        )}

        {/* Cover Letter Accordion / Preview */}
        {hasCoverLetter && (
          <div className="pt-2  border-inherit/60">
            <button
              onClick={() => setShowCoverLetter((prev) => !prev)}
              className="flex items-center justify-between w-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 py-1 hover:opacity-80 transition"
            >
              <span>Cover Letter</span>
              {showCoverLetter ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </button>
            {showCoverLetter ? (
              <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-white/70 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                {data.cover_letter}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 italic">
                &ldquo;{data.cover_letter}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer — Full View link */}
      <a
        href="/vos-sync/client/applicants"
        className="flex items-center justify-center gap-1.5 py-2.5 border-t border-inherit text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-white/40 dark:hover:bg-zinc-800/40 transition"
      >
        View Full Application Details
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
