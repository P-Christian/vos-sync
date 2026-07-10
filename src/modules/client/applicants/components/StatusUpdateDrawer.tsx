// src/modules/client/applicants/components/StatusUpdateDrawer.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Applicant, ApplicationStatus, STATUS_LABELS, STATUS_FLOW } from "../types";
import { AlertCircle } from "lucide-react";

interface StatusUpdateDrawerProps {
  applicant: Applicant | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    applicationId: number,
    status: ApplicationStatus,
    notes: string
  ) => Promise<void>;
  saving: boolean;
  error: string;
}

export default function StatusUpdateDrawer({
  applicant,
  open,
  onClose,
  onSave,
  saving,
  error,
}: StatusUpdateDrawerProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(
    applicant?.application_status ?? "APPLIED"
  );
  const [notes, setNotes] = useState(applicant?.client_notes ?? "");

  React.useEffect(() => {
    if (applicant) {
      setSelectedStatus(applicant.application_status);
      setNotes(applicant.client_notes ?? "");
    }
  }, [applicant]);

  const handleSave = async () => {
    if (!applicant) return;
    await onSave(applicant.application_id, selectedStatus, notes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Update Application Status
          </DialogTitle>
          {applicant && (
            <p className="text-xs text-zinc-500 mt-1">
              {applicant.applicant_name ?? `Applicant #${applicant.application_id}`} &bull;{" "}
              {applicant.job_title ?? "—"}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Status <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as ApplicationStatus)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="status-notes"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              client Notes (optional)
            </Label>
            <Textarea
              id="status-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this applicant..."
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 text-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 text-sm rounded-lg"
          >
            {saving ? "Saving..." : "Save Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

