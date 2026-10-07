/* eslint-disable react-hooks/set-state-in-effect */
// src/modules/client/pipeline/components/StageEditModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CanonicalStageType,
  CANONICAL_STAGE_TYPES,
  JobPipelineStage,
  PipelineStage,
  STAGE_COLOR_CLASSES,
  STAGE_TYPE_DETAILS,
} from "../types";
import { Sparkles, ShieldCheck } from "lucide-react";

interface StageEditModalProps {
  open: boolean;
  onClose: () => void;
  stage: PipelineStage | JobPipelineStage | null;
  onSave: (data: {
    stage_name: string;
    stage_type: CanonicalStageType;
    color: string;
    description: string;
  }) => Promise<void>;
  saving: boolean;
}

const COLOR_OPTIONS = [
  { key: "sky", label: "Sky" },
  { key: "blue", label: "Blue" },
  { key: "indigo", label: "Indigo" },
  { key: "purple", label: "Purple" },
  { key: "violet", label: "Violet" },
  { key: "amber", label: "Amber" },
  { key: "emerald", label: "Emerald" },
  { key: "rose", label: "Rose" },
  { key: "zinc", label: "Zinc" },
];

export default function StageEditModal({
  open,
  onClose,
  stage,
  onSave,
  saving,
}: StageEditModalProps) {
  const isEditing = Boolean(stage);

  const [stageName, setStageName] = useState("");
  const [stageType, setStageType] = useState<CanonicalStageType>("SCREENING");
  const [color, setColor] = useState("sky");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (stage) {
      setStageName(stage.stage_name);
      setStageType(stage.stage_type);
      setColor(stage.color || "sky");
      setDescription(stage.description || "");
    } else {
      setStageName("");
      setStageType("SCREENING");
      setColor("sky");
      setDescription("");
    }
    setFormError("");
  }, [stage, open]);

  const handleStageTypeChange = (newType: CanonicalStageType) => {
    setStageType(newType);
    if (!isEditing) {
      setColor(STAGE_TYPE_DETAILS[newType]?.defaultColor || "sky");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) {
      setFormError("Stage name is required.");
      return;
    }

    await onSave({
      stage_name: stageName.trim(),
      stage_type: stageType,
      color,
      description: description.trim(),
    });
  };

  const isSystemStage = stage?.is_system;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-md:max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Pipeline Stage" : "Add New Pipeline Stage"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure custom terminology mapped to a deterministic system stage.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {formError && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {formError}
            </div>
          )}

          {/* Stage Name */}
          <div className="space-y-1.5">
            <Label htmlFor="stage-name" className="text-xs font-medium">
              Stage Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="stage-name"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="e.g., Technical Assessment, Coding Challenge"
              className="h-9 text-xs"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              What your hiring managers and candidates see in the ATS interface.
            </p>
          </div>

          {/* Canonical Semantic Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Canonical Category (Semantic Type) <span className="text-rose-500">*</span>
              </Label>
              {isSystemStage && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                  <ShieldCheck className="h-3 w-3 text-primary" /> System Locked
                </span>
              )}
            </div>

            <Select
              value={stageType}
              onValueChange={(val) => handleStageTypeChange(val as CanonicalStageType)}
              disabled={isSystemStage}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANONICAL_STAGE_TYPES.map((type) => {
                  const details = STAGE_TYPE_DETAILS[type];
                  return (
                    <SelectItem key={type} value={type} className="text-xs py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold">{details.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {details.description}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

 
          </div>

          {/* Color Theme Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Visual Badge Color</Label>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.key;
                const palette = STAGE_COLOR_CLASSES[c.key] || STAGE_COLOR_CLASSES.sky;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      palette.badge
                    } ${isSelected ? "ring-2 ring-primary ring-offset-1 font-semibold" : "opacity-75 hover:opacity-100"}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
                    <span className="capitalize text-[11px]">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="stage-desc" className="text-xs font-medium">
              Internal Guidelines / Notes (optional)
            </Label>
            <Textarea
              id="stage-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., In this stage candidates complete a 45-minute coding exercise..."
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-8 text-xs">
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
