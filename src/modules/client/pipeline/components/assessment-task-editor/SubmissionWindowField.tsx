"use client";

import React, { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

const MAX_WINDOW_DAYS = 365;

interface SubmissionWindowFieldProps {
  endpoint: string;
  initialDays?: number | null;
  readOnly?: boolean;
}

function validateDraft(draft: string): { days: number | null } | { message: string } {
  const trimmed = draft.trim();
  if (trimmed === "") return { days: null };
  if (!/^\d+$/.test(trimmed)) return { message: "Enter a whole number of days (0-365)." };
  const days = Number(trimmed);
  if (!Number.isSafeInteger(days) || days > MAX_WINDOW_DAYS) {
    return { message: `Enter a whole number of days (0-${MAX_WINDOW_DAYS}).` };
  }
  return { days };
}

export default function SubmissionWindowField({
  endpoint,
  initialDays = null,
  readOnly = false,
}: SubmissionWindowFieldProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(initialDays === null ? "" : String(initialDays));
  const [savedDays, setSavedDays] = useState<number | null>(initialDays);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.trim() !== (savedDays === null ? "" : String(savedDays));

  async function persist(days: number | null): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment_submission_window_days: days }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Failed to save submission window.");
        return;
      }
      setSavedDays(days);
      setDraft(days === null ? "" : String(days));
    } catch {
      setError("Failed to save submission window.");
    } finally {
      setSaving(false);
    }
  }

  function handleSave(): void {
    const validated = validateDraft(draft);
    if ("message" in validated) {
      setError(validated.message);
      return;
    }
    void persist(validated.days);
  }

  if (readOnly) {
    return (
      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Submission window:{" "}
        <span className="font-semibold text-foreground">
          {savedDays === null ? "No limit" : `${savedDays} day${savedDays === 1 ? "" : "s"}`}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-36 flex-1 space-y-1">
          <Label htmlFor={inputId} className="text-xs font-medium">
            Submission window (days)
          </Label>
          <Input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            placeholder="No limit"
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving || !dirty}
          onClick={handleSave}
          className="h-8 text-xs gap-1.5 rounded-lg"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Saving..." : "Save"}
        </Button>
        {savedDays !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => void persist(null)}
            className="h-8 text-xs rounded-lg text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Candidates must submit within this many days. Empty means no limit.
      </p>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
