// src/modules/client/pipeline/components/assessment-task-editor/TaskSourceModal.tsx
// "Add assessment task" chooser: pick a task from the company library (the
// editor then prefills from a copy) or start from a blank task. The library
// is fetched lazily on first open and cached in component state; a Retry
// re-fetches after a failure.
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AlertCircle, ClipboardList, FilePlus2, Loader2 } from "lucide-react";
import type { LibraryTask } from "../../services/assessment-task.library";

interface TaskSourceModalProps {
  open: boolean;
  libraryEndpoint: string;
  onClose: () => void;
  onPickBlank: () => void;
  onPickTask: (task: LibraryTask) => void;
}

const LOAD_ERROR = "Could not load existing tasks.";

export default function TaskSourceModal({
  open,
  libraryEndpoint,
  onClose,
  onPickBlank,
  onPickTask,
}: TaskSourceModalProps) {
  const [tasks, setTasks] = React.useState<LibraryTask[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // The effect only kicks off the async load; every setState happens in
  // promise callbacks and event handlers, never synchronously here.
  React.useEffect(() => {
    if (!open || tasks !== null || error !== null) return;
    const controller = new AbortController();
    fetch(libraryEndpoint, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          tasks?: LibraryTask[];
        } | null;
        if (controller.signal.aborted) return;
        if (!res.ok || !json?.success || !Array.isArray(json.tasks)) {
          setError(LOAD_ERROR);
          return;
        }
        setTasks(json.tasks);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(LOAD_ERROR);
      });
    return () => controller.abort();
  }, [open, tasks, error, libraryEndpoint]);

  const handlePick = (value: string) => {
    const picked = tasks?.find((task) => String(task.id) === value);
    if (picked) onPickTask(picked);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) onClose();
      }}
    >
      <DialogContent className="max-md:max-w-[calc(100vw-2rem)] max-md:max-h-[90dvh] max-md:overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <ClipboardList className="h-4 w-4 text-primary" />
            Add assessment task
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground md:text-xs">
            Start from a task in your company library, or create a blank task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Choose an existing task
          </Label>
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-7 shrink-0 text-xs"
              >
                Retry
              </Button>
            </div>
          ) : tasks === null ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Loading existing tasks...
            </div>
          ) : tasks.length === 0 ? (
            <p className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
              No saved tasks yet. Start with a blank task below.
            </p>
          ) : (
            <SearchableSelect
              options={tasks.map((task) => ({
                value: String(task.id),
                label: `${task.title} — ${task.stage_name} · ${task.pipeline_name}`,
              }))}
              onValueChange={handlePick}
              placeholder="Choose an existing task…"
              ariaLabel="Choose an existing task"
              className="h-9 text-xs"
            />
          )}
        </div>

        <div className="space-y-1.5 border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPickBlank}
            className="h-9 w-full text-xs gap-1.5 rounded-lg"
          >
            <FilePlus2 className="h-3.5 w-3.5" /> Blank task
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Opens an empty task editor.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
