/* eslint-disable react-hooks/set-state-in-effect */
// src/modules/client/pipeline/components/TransitionConfigModal.tsx
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  JobPipelineStage,
  PipelineStage,
  STAGE_COLOR_CLASSES,
  STAGE_TYPE_DETAILS,
} from "../types";
import { ArrowRight, Info } from "lucide-react";

interface TransitionConfigModalProps {
  open: boolean;
  onClose: () => void;
  sourceStage: PipelineStage | JobPipelineStage | null;
  allStages: (PipelineStage | JobPipelineStage)[];
  onSave: (fromStageId: number, targetStageIds: number[]) => Promise<void>;
  saving: boolean;
}

export default function TransitionConfigModal({
  open,
  onClose,
  sourceStage,
  allStages,
  onSave,
  saving,
}: TransitionConfigModalProps) {
  const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);

  useEffect(() => {
    if (sourceStage) {
      setSelectedTargetIds(sourceStage.allowed_next_stage_ids ?? []);
    } else {
      setSelectedTargetIds([]);
    }
  }, [sourceStage, open]);

  if (!sourceStage) return null;

  // Filter candidate target stages:
  // Cannot transition to self.
  // "Rejected" and "Withdrawn" are system-wide terminal exits available automatically from all non-terminal stages.
  // "Applied" is the initial intake stage and cannot be transitioned back into from other stages.
  const eligibleStages = allStages.filter(
    (s) =>
      s.id !== sourceStage.id &&
      s.stage_type !== "REJECTED" &&
      s.stage_type !== "WITHDRAWN" &&
      s.stage_type !== "APPLIED"
  );

  const toggleTarget = (stageId: number) => {
    setSelectedTargetIds((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleSave = async () => {
    await onSave(sourceStage.id, selectedTargetIds);
  };

  const sourcePalette =
    STAGE_COLOR_CLASSES[sourceStage.color] || STAGE_COLOR_CLASSES.sky;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-md:max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <span>Configure Transitions</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Define which stages candidates can advance to directly from this step.
          </p>
        </DialogHeader>

        {/* Source Stage Banner */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/70">
          <span className="text-xs font-medium text-muted-foreground">Moving from:</span>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sourcePalette.badge}`}
          >
            <span className={`h-2 w-2 rounded-full ${sourcePalette.dot}`} />
            <span>{sourceStage.stage_name}</span>
          </div>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {STAGE_TYPE_DETAILS[sourceStage.stage_type]?.label}
          </Badge>
        </div>

        {/* Target Stage Selection */}
        <div className="space-y-3 py-2">
          <Label className="text-xs font-medium">Allowed Destination Stages</Label>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {eligibleStages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                No eligible destination stages found in this pipeline.
              </p>
            ) : (
              eligibleStages.map((stage) => {
                const isChecked = selectedTargetIds.includes(stage.id);
                const palette =
                  STAGE_COLOR_CLASSES[stage.color] || STAGE_COLOR_CLASSES.sky;

                return (
                  <div
                    key={stage.id}
                    onClick={() => toggleTarget(stage.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary/5 border-primary/40 shadow-xs"
                        : "bg-card hover:bg-muted/50 border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`stage-${stage.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleTarget(stage.id)}
                        className="pointer-events-none"
                      />
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${palette.dot}`}
                        />
                        <span className="font-medium text-foreground">
                          {stage.stage_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {STAGE_TYPE_DETAILS[stage.stage_type]?.label}
                      </Badge>
                      {isChecked && (
                        <ArrowRight className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Automatic Exits Notice */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> System terminal outcomes (<strong>Rejected</strong> and{" "}
              <strong>Withdrawn</strong>) are universally permitted from any active stage and do not require manual transition configuration.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs"
          >
            {saving ? "Saving..." : "Save Transitions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
