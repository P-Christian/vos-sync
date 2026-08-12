// src/modules/client/company-profile/components/CompanyDocuments.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, CheckCircle2, Eye, RefreshCw, Lock } from "lucide-react";

type DocumentTypeKey = "DTI_SEC_REGISTRATION" | "BUSINESS_PERMIT" | "TIN_DOCUMENT";

interface DocSlotConfig {
  type: DocumentTypeKey;
  title: string;
  description: string;
}

const DOCUMENT_SLOTS: DocSlotConfig[] = [
  {
    type: "DTI_SEC_REGISTRATION",
    title: "DTI / SEC Registration",
    description: "Proof of company registration",
  },
  {
    type: "BUSINESS_PERMIT",
    title: "Business Permit",
    description: "Proof of business operation",
  },
  {
    type: "TIN_DOCUMENT",
    title: "TIN Document",
    description: "Tax identification document",
  },
];

interface UploadedDoc {
  id: string;
  document_type: string;
  name: string;
  size: number;
  uploaded_at?: string | null;
}

interface CompanyDocumentsProps {
  companyId?: number;
  onDocsChange?: (count: number) => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const raw = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : `${dateStr.replace(" ", "T")}Z`;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CompanyDocuments({ companyId, onDocsChange }: CompanyDocumentsProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [slotError, setSlotError] = useState<Record<string, string>>({});

  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const MAX_SIZE_MB = 10;

  const fetchDocs = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/client/company-profile/documents?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to load documents.");
      const data: UploadedDoc[] = await res.json();
      setDocs(data);
    } catch (err) {
      console.error("Error loading verification documents:", err);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    onDocsChange?.(docs.length);
  }, [docs, onDocsChange]);

  const triggerFileInput = (docType: string) => {
    setSlotError((prev) => ({ ...prev, [docType]: "" }));
    fileInputRefs.current[docType]?.click();
  };

  const handleFileChange = async (docType: DocumentTypeKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;
    const file = selectedFiles[0];

    setSlotError((prev) => ({ ...prev, [docType]: "" }));

    if (!ALLOWED_TYPES.includes(file.type)) {
      setSlotError((prev) => ({
        ...prev,
        [docType]: `Only PDF, JPG, PNG, or WEBP files are allowed. (${file.name})`,
      }));
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setSlotError((prev) => ({
        ...prev,
        [docType]: `File must be under ${MAX_SIZE_MB}MB. (${file.name})`,
      }));
      e.target.value = "";
      return;
    }

    setUploadingSlot(docType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (companyId) formData.append("companyId", String(companyId));
      formData.append("documentType", docType);

      const res = await fetch("/api/client/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed for ${file.name}`);
      }

      await fetchDocs();
    } catch (err: unknown) {
      setSlotError((prev) => ({
        ...prev,
        [docType]: err instanceof Error ? err.message : "Upload failed. Please try again.",
      }));
    } finally {
      setUploadingSlot(null);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
        <Lock className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Upload documents required to verify your company.
          These documents are <span className="font-semibold text-zinc-700 dark:text-zinc-300">private</span> and will only be accessible to authorized VOS Sync administrators.
        </p>
      </div>

      {/* Document Slots */}
      <div className="space-y-3">
        {DOCUMENT_SLOTS.map((slot) => {
          const existingDoc = docs.find((d) => d.document_type === slot.type);
          const isUploading = uploadingSlot === slot.type;
          const errorMsg = slotError[slot.type];

          return (
            <div
              key={slot.type}
              className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {slot.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {slot.description}
                  </p>
                </div>

                {existingDoc ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-md border border-emerald-200/80 dark:border-emerald-900/50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <a
                        href={`/api/client/assets/${existingDoc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate max-w-[160px] sm:max-w-[200px] cursor-pointer font-semibold"
                        title={existingDoc.name}
                      >
                        {existingDoc.name}
                      </a>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                        ({formatFileSize(existingDoc.size)}
                        {existingDoc.uploaded_at ? ` · Uploaded ${formatDate(existingDoc.uploaded_at)}` : ""})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => triggerFileInput(slot.type)}
                        className="h-8 text-xs gap-1.5 font-medium"
                      >
                        {isUploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
                        )}
                        Replace
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 text-xs gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        <a href={`/api/client/assets/${existingDoc.id}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => triggerFileInput(slot.type)}
                      className="h-9 text-xs gap-2 font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Slot Error Message */}
              {errorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-2">
                  <X className="h-3.5 w-3.5 shrink-0" />
                  {errorMsg}
                </p>
              )}

              {/* Hidden file input */}
              <input
                ref={(el) => {
                  fileInputRefs.current[slot.type] = el;
                }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => handleFileChange(slot.type, e)}
                disabled={isUploading}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
