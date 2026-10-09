// src/modules/client/pipeline/components/assessment-task-editor/TaskRow.tsx
// One task card: badges, per-type summary, reorder/edit/delete actions,
// inline edit form, and two-step delete confirmation.

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CompanyAssessmentTaskRow } from "../../services/assessment-task.service";
import type {
  AssessmentTaskType,
  CreateTaskInput,
} from "@/modules/shared/assessment";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ExternalLink,
  FileText,
  ListChecks,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { TASK_TYPE_META } from "./types";
import TaskForm from "./TaskForm";

function TaskTypeIcon({ taskType }: { taskType: AssessmentTaskType }) {
  switch (taskType) {
    case "SINGLE_CHOICE":
      return <ListChecks className="h-3.5 w-3.5" />;
    case "EXTERNAL_TASK":
      return <ExternalLink className="h-3.5 w-3.5" />;
    case "FILE_UPLOAD":
      return <Upload className="h-3.5 w-3.5" />;
    case "TEXT_RESPONSE":
      return <FileText className="h-3.5 w-3.5" />;
  }
}

function taskSummary(task: CompanyAssessmentTaskRow): string {
  switch (task.task_type) {
    case "SINGLE_CHOICE": {
      const count = task.choice_options?.length ?? 0;
      return `${count} option${count === 1 ? "" : "s"} · correct answer set`;
    }
    case "EXTERNAL_TASK":
      return task.external_url ?? "External link";
    case "FILE_UPLOAD":
      return "Candidate uploads a proof file";
    case "TEXT_RESPONSE":
      return `Up to ${(task.text_max_length ?? 0).toLocaleString()} characters`;
  }
}

interface TaskRowProps {
  task: CompanyAssessmentTaskRow;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  submitting: boolean;
  editing: boolean;
  confirmingDelete: boolean;
  readOnly?: boolean;
  onMove: (direction: "up" | "down") => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (payload: CreateTaskInput) => Promise<string | null>;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export default function TaskRow({
  task,
  index,
  isFirst,
  isLast,
  busy,
  submitting,
  editing,
  confirmingDelete,
  readOnly = false,
  onMove,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: TaskRowProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 w-4 shrink-0 text-center text-[10px] font-bold text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border/80 bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground">
                <TaskTypeIcon taskType={task.task_type} />
                {TASK_TYPE_META[task.task_type].label}
              </span>
              {task.is_required ? (
                <Badge variant="default" className="text-[10px]">
                  Required
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Optional
                </Badge>
              )}
            </div>
            <p className="truncate text-xs font-semibold text-foreground">
              {task.title}
            </p>
            {task.instructions && (
              <p className="line-clamp-2 text-[11px] text-muted-foreground">
                {task.instructions}
              </p>
            )}
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CheckCircle className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{taskSummary(task)}</span>
            </p>
          </div>
        </div>
        {!editing && !readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove("up")}
              disabled={isFirst || busy}
              className="h-7 w-7 p-0"
              title="Move up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove("down")}
              disabled={isLast || busy}
              className="h-7 w-7 p-0"
              title="Move down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              disabled={busy}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Edit task"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAskDelete}
              disabled={busy}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
              title="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {editing && !readOnly && (
        <TaskForm
          initial={task}
          sortOrder={task.sort_order}
          submitting={submitting}
          onCancel={onCancelEdit}
          onSubmit={onSubmitEdit}
        />
      )}

      {confirmingDelete && !readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
          <p className="text-xs text-muted-foreground">
            Delete{" "}
            <span className="font-semibold text-foreground">
              {task.title}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelDelete}
              disabled={busy}
              className="h-7 text-xs"
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onConfirmDelete}
              disabled={busy}
              className="h-7 text-xs"
            >
              {busy ? "Deleting..." : "Delete task"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
