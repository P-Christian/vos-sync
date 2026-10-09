"use client";

import { Button } from "@/components/ui/button";
import type { ReviewConfirmAction } from "./ReviewConfirmDialog";

export type AttemptBarAction = "START_REVIEW" | "PASS" | ReviewConfirmAction;

function canAct(status: string, action: AttemptBarAction): boolean {
  if (action === "START_REVIEW") return status === "SUBMITTED";
  if (action === "REQUEST_REVISION")
    return status === "UNDER_REVIEW" || status === "FAILED" || status === "SUBMITTED";
  return status === "UNDER_REVIEW";
}

const ACTION_LABEL: Record<AttemptBarAction, string> = {
  START_REVIEW: "Start review",
  PASS: "Pass",
  FAIL: "Fail",
  REQUEST_REVISION: "Request revision",
};

interface AttemptActionBarProps {
  status: string;
  attemptId: number;
  busy: boolean;
  onRun: (attemptId: number, action: AttemptBarAction) => void;
  onAskConfirm: (attemptId: number, action: ReviewConfirmAction) => void;
}

export default function AttemptActionBar({
  status,
  attemptId,
  busy,
  onRun,
  onAskConfirm,
}: AttemptActionBarProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {(Object.keys(ACTION_LABEL) as AttemptBarAction[]).map((action) => (
        <Button
          key={action}
          variant={action === "PASS" ? "default" : "outline"}
          size="sm"
          disabled={!canAct(status, action) || busy}
          onClick={() => {
            if (action === "FAIL" || action === "REQUEST_REVISION") {
              onAskConfirm(attemptId, action);
            } else {
              onRun(attemptId, action);
            }
          }}
          className="max-md:min-h-10"
        >
          {ACTION_LABEL[action]}
        </Button>
      ))}
    </div>
  );
}
