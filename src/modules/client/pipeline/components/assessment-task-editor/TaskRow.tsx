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
  GripVertical,
  ListChecks,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { TASK_TYPE_META } from "./types";
import { formStateFromTask } from "./task-form-state";
import TaskForm from "./TaskForm";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";

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
  isReordering?: boolean;
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
  isReordering = false,
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
  const dragControls = useDragControls();
  const isMoveDisabled = isFirst || busy || isReordering || submitting;
  const isDownDisabled = isLast || busy || isReordering || submitting;

  return (
    <Reorder.Item
      value={task}
      id={String(task.id)}
      layout
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.95,
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: "hidden",
        transition: { duration: 0.25, ease: "easeInOut" },
      }}
      transition={{
        layout: { type: "spring", stiffness: 450, damping: 32 },
        opacity: { duration: 0.2 },
      }}
      className="space-y-2 rounded-lg border border-border/70 bg-card p-3 shadow-xs select-none transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
          {!readOnly && (
            <button
              type="button"
              onPointerDown={(e) => {
                if (!busy && !isReordering && !submitting) {
                  dragControls.start(e);
                }
              }}
              disabled={busy || isReordering || submitting}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted/80 disabled:opacity-20 disabled:pointer-events-none transition-colors touch-none"
              title="Drag to reorder task"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}

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
              disabled={isMoveDisabled}
              className="h-7 w-7 p-0 disabled:opacity-25 transition-opacity"
              title={isReordering ? "Saving order..." : isFirst ? "First task" : "Move up"}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove("down")}
              disabled={isDownDisabled}
              className="h-7 w-7 p-0 disabled:opacity-25 transition-opacity"
              title={isReordering ? "Saving order..." : isLast ? "Last task" : "Move down"}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              disabled={busy || isReordering}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-25"
              title="Edit task"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAskDelete}
              disabled={busy || isReordering}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 disabled:opacity-25"
              title="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && !readOnly && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <TaskForm
              initial={formStateFromTask(task)}
              sortOrder={task.sort_order}
              submitting={submitting}
              onCancel={onCancelEdit}
              onSubmit={onSubmitEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmingDelete && !readOnly && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
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
                  {busy ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Deleting...
                    </span>
                  ) : (
                    "Delete task"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
