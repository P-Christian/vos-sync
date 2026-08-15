// src/modules/client/jobs/components/SuggestCategoryModal.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { RoleCategory } from "../types";

interface SuggestCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onSelectCategory: (categoryId: number | null, categoryName: string) => void;
}

interface MatchResponse {
  has_existing_match?: boolean;
  confidence?: number;
  existing_category?: RoleCategory;
  message?: string;
  closest_match?: RoleCategory | null;
  suggested_name?: string;
}

export function SuggestCategoryModal({
  open,
  onOpenChange,
  initialQuery = "",
  onSelectCategory,
}: SuggestCategoryModalProps) {
  const [categoryName, setCategoryName] = useState(initialQuery);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingMatch, setExistingMatch] = useState<MatchResponse | null>(null);

  // Sync initialQuery when opened
  React.useEffect(() => {
    if (open && initialQuery) {
      setCategoryName(initialQuery);
      setExistingMatch(null);
      setError(null);
    }
  }, [open, initialQuery]);

  const handleCheckAndSubmit = async (forceSubmit = false) => {
    const trimmed = categoryName.trim();
    if (!trimmed) {
      setError("Category name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/client/jobs/categories/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_name: trimmed,
          description: description.trim(),
        }),
      });

      const data: MatchResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to process category suggestion.");
      }

      // If close match found and not forcing submit
      if (data.has_existing_match && data.existing_category && !forceSubmit) {
        setExistingMatch(data);
        setLoading(false);
        return;
      }

      // Successful suggestion submission
      onSelectCategory(null, trimmed);
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseExisting = (cat: RoleCategory) => {
    onSelectCategory(cat.category_id, cat.category_name);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCategoryName("");
    setDescription("");
    setError(null);
    setExistingMatch(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader className="pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Suggest a Role Category</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Submit a new category candidate for platform taxonomy governance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Deduplication Alert Card */}
          {existingMatch?.existing_category && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 space-y-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Existing Category Match Detected ({existingMatch.confidence}% match)
                  </p>
                  <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    We found an existing canonical category:{" "}
                    <span className="font-semibold text-foreground underline decoration-amber-400">
                      {existingMatch.existing_category.category_name}
                    </span>
                    . Using canonical categories ensures higher talent search discoverability.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUseExisting(existingMatch.existing_category!)}
                  className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Use &quot;{existingMatch.existing_category.category_name}&quot;
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleCheckAndSubmit(true)}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Submit as New Anyway
                </Button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-1.5">
            <Label htmlFor="sug-name" className="text-xs font-semibold">
              Category Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="sug-name"
              placeholder="e.g. Robotics & Embedded Systems"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (existingMatch) setExistingMatch(null);
                if (error) setError(null);
              }}
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sug-desc" className="text-xs font-semibold">
              Why is this category needed? (Scope & Technologies)
            </Label>
            <Textarea
              id="sug-desc"
              rows={3}
              placeholder="Briefly describe the domain, core responsibilities, or tools (e.g. ROS, PLC, kinematics)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs rounded-lg resize-none"
            />
          </div>

          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            Note: Your job will still be published immediately with this custom category while platform governance reviews the candidate.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 text-xs"
          >
            Cancel
          </Button>
          {!existingMatch && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleCheckAndSubmit(false)}
              disabled={loading || !categoryName.trim()}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Submit Suggestion
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
