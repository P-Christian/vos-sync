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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CompanyVerificationRecord } from "../types";
import { AlertCircle } from "lucide-react";

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyVerificationRecord | null;
  mode: "reject" | "request_correction";
  onConfirm: (action: "reject" | "request_correction", reason: string, internalNotes: string) => Promise<void>;
  isSubmitting: boolean;
}

const REASON_PRESETS = [
  "Select a standard preset reason...",
  "Incomplete or unreadable BIR Form 2303 registration document",
  "Expired SEC / DTI Certificate of Registration",
  "Business Permit address mismatch with submitted company profile",
  "Invalid or unverified Company TIN registration number",
  "Authorized representative identification missing or mismatch",
  "Custom reason (see detailed notes below)",
];

export const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  isOpen,
  onClose,
  company,
  mode,
  onConfirm,
  isSubmitting,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  if (!company) return null;

  const isReject = mode === "reject";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalPublicReason =
      selectedPreset && !selectedPreset.startsWith("Select") && selectedPreset !== "Custom reason (see detailed notes below)"
        ? `${selectedPreset}. ${customReason}`.trim()
        : customReason.trim();

    if (!finalPublicReason) return;

    await onConfirm(mode, finalPublicReason, internalNotes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertCircle className={`h-5 w-5 ${isReject ? "text-destructive" : "text-amber-500"}`} />
            {isReject ? "Reject Company Verification" : "Request Correction"}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? `You are rejecting verification for ${company.company_name}. Please provide a clear explanation.`
              : `Request missing or corrected documents from ${company.company_name}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Preset Reason Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="preset-reason" className="text-xs font-semibold">
              Standard Reason Preset
            </Label>
            <NativeSelect
              id="preset-reason"
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full text-xs"
            >
              {REASON_PRESETS.map((preset, i) => (
                <option key={i} value={preset}>
                  {preset}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Public Reason Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="public-reason" className="text-xs font-semibold">
              Public Reason / Action Items <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="public-reason"
              placeholder="Provide clear details visible to the company owner..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>

          {/* Internal Admin Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="internal-notes" className="text-xs font-semibold">
              Internal Admin Notes <span className="text-muted-foreground font-normal">(Private)</span>
            </Label>
            <Textarea
              id="internal-notes"
              placeholder="Notes visible only to internal VOS admin team..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isReject ? "destructive" : "default"}
              size="sm"
              disabled={isSubmitting || (!selectedPreset && !customReason.trim())}
            >
              {isSubmitting
                ? "Submitting..."
                : isReject
                ? "Confirm Rejection"
                : "Send Correction Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
