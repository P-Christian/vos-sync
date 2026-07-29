// src/modules/client/company-profile/components/CompanyDocuments.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Loader2, X, CheckCircle2 } from "lucide-react";

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
}

interface CompanyDocumentsProps {
  companyId?: number;
  onDocsChange?: (count: number) => void;
}

export default function CompanyDocuments({ companyId, onDocsChange }: CompanyDocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [uploadError, setUploadError] = useState("");

  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const MAX_SIZE_MB = 10;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setUploadError("");

    const invalidType = selectedFiles.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalidType) {
      setUploadError(`Only PDF, JPG, PNG, or WEBP files are allowed. (${invalidType.name})`);
      e.target.value = "";
      return;
    }

    const invalidSize = selectedFiles.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (invalidSize) {
      setUploadError(`Each file must be under ${MAX_SIZE_MB}MB. (${invalidSize.name})`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        if (companyId) formData.append("companyId", String(companyId));

        const res = await fetch("/api/client/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);

        const uploaded = await res.json();
        return { id: uploaded.id, name: file.name, size: file.size };
      });

      const uploadedDocs = await Promise.all(uploadPromises);
      setDocs((prev) => [...prev, ...uploadedDocs]);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!companyId) return;

    let active = true;
    const fetchDocs = async () => {
      try {
        const res = await fetch(`/api/client/company-profile/documents?companyId=${companyId}`);
        if (!res.ok) throw new Error("Failed to load documents.");
        const data = await res.json();
        if (active) {
          setDocs(data);
        }
      } catch (err) {
        console.error("Error loading verification documents:", err);
      }
    };

    fetchDocs();
    return () => {
      active = false;
    };
  }, [companyId, onDocsChange]);

  const removeDoc = async (id: string) => {
    setUploadError("");
    try {
      const res = await fetch(`/api/client/company-profile/documents?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document. Please try again.");

      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Delete failed. Please try again."
      );
    }
  };

  useEffect(() => {
    onDocsChange?.(docs.length);
  }, [docs, onDocsChange]);

  return (
    <div className="space-y-4">
      {/* Upload Trigger */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 transition-all cursor-pointer
          ${uploading
            ? "border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60"
            : "border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10"
          }`}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        ) : (
          <Upload className="h-5 w-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
        )}
        <div className="text-center">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {uploading ? "Uploading documents..." : "Click to upload documents"}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            PDF, JPG, PNG, WEBP — max {MAX_SIZE_MB}MB each (multiple allowed)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {/* Error */}
      {uploadError && (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <X className="h-3.5 w-3.5 shrink-0" />
          {uploadError}
        </p>
      )}

      {/* Uploaded Files List */}
      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/client/assets/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline truncate block cursor-pointer"
                >
                  {doc.name}
                </a>
                <p className="text-[11px] text-zinc-400">
                  {(doc.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                onClick={() => removeDoc(doc.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {docs.length === 0 && !uploading && (
        <p className="text-[11px] text-zinc-400 text-center">
          No documents uploaded yet. Documents are private and only visible to administrators.
        </p>
      )}
    </div>
  );
}
