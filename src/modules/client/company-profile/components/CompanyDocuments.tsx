// src/modules/client/company-profile/components/CompanyDocuments.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, CheckCircle2, Eye, RefreshCw, Lock, Trash2, FileText, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type DocumentTypeKey = "DTI_SEC_REGISTRATION" | "BUSINESS_PERMIT" | "TIN_DOCUMENT" | "OTHER_DOCUMENT";


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
  const otherFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [isUploadingOther, setIsUploadingOther] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [slotError, setSlotError] = useState<Record<string, string>>({});
  const [otherError, setOtherError] = useState<string | null>(null);

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

  // Handler for multiple Other Supporting Documents upload
  const handleOtherFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setOtherError(null);

    // Validate all files
    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setOtherError(`Invalid file format in "${file.name}". Only PDF, JPG, PNG, or WEBP files are allowed.`);
        e.target.value = "";
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setOtherError(`File "${file.name}" exceeds the ${MAX_SIZE_MB}MB size limit.`);
        e.target.value = "";
        return;
      }
    }

    setIsUploadingOther(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        if (companyId) formData.append("companyId", String(companyId));
        formData.append("documentType", "OTHER_DOCUMENT");

        const res = await fetch("/api/client/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Upload failed for ${file.name}`);
        }
      }

      await fetchDocs();
    } catch (err: unknown) {
      setOtherError(err instanceof Error ? err.message : "Upload failed for one or more files. Please try again.");
    } finally {
      setIsUploadingOther(false);
      e.target.value = "";
    }
  };

  // Handler for deleting an individual document
  const handleDeleteDoc = async (fileId: string) => {
    setDeletingDocId(fileId);
    setOtherError(null);
    try {
      const res = await fetch(`/api/client/company-profile/documents?id=${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete document.");
      }
      await fetchDocs();
    } catch (err: unknown) {
      setOtherError(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  const otherDocs = docs.filter(
    (d) => d.document_type === "OTHER_DOCUMENT" || d.document_type === "OTHER"
  );

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

      {/* Primary Verification Document Slots */}
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
                  <div className="flex flex-wrap items-center gap-3 justify-end">
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
              <AnimatePresence>
                {errorMsg && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-2 overflow-hidden"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" />
                    {errorMsg}
                  </motion.p>
                )}
              </AnimatePresence>

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

      {/* Other Supporting Documents (Multi-Upload Section) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Other Supporting Documents
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload optional supplementary files such as BIR 2303, General Information Sheet (GIS), Secretary&apos;s Certificate, or Special Permits.
            </p>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploadingOther}
              onClick={() => otherFileInputRef.current?.click()}
              className="h-9 text-xs gap-1.5 font-medium border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            >
              {isUploadingOther ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Add Documents
                </>
              )}
            </Button>

            {/* Hidden multi-file input for Other Documents */}
            <input
              ref={otherFileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleOtherFilesChange}
              disabled={isUploadingOther}
            />
          </div>
        </div>

        {/* Error banner for Other Documents */}
        <AnimatePresence>
          {otherError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40 overflow-hidden"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              {otherError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* List of uploaded other documents */}
        {otherDocs.length > 0 ? (
          <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
            <AnimatePresence initial={false}>
              {otherDocs.map((doc) => {
                const isDeleting = deletingDocId === doc.id;

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={`/api/client/assets/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-zinc-800 dark:text-zinc-200 hover:underline truncate block max-w-xs sm:max-w-md"
                          title={doc.name}
                        >
                          {doc.name}
                        </a>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {formatFileSize(doc.size)}
                          {doc.uploaded_at ? ` · Uploaded ${formatDate(doc.uploaded_at)}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-2 text-xs gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        <a href={`/api/client/assets/${doc.id}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </a>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="h-7 px-2 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-5 border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800 text-zinc-400 text-xs">
            No other supporting documents uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}
