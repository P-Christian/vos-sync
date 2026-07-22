"use client";

// src/modules/client/interviews/components/InterviewEvaluationModal.tsx

import React, { useState } from "react";
import { Interview, EvaluationFormData } from "../types";
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
import { Star, Loader2, Award, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewEvaluationModalProps {
  interview: Interview | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmitEvaluation: (payload: EvaluationFormData) => Promise<boolean>;
}

export default function InterviewEvaluationModal({
  interview,
  open,
  saving,
  onClose,
  onSubmitEvaluation,
}: InterviewEvaluationModalProps) {
  const [score, setScore] = useState<number>(interview?.evaluation_score || 0);
  const [feedbackText, setFeedbackText] = useState<string>(interview?.feedback || "");
  const [decision, setDecision] = useState<"HIRED" | "REJECTED" | "NO_ACTION">("NO_ACTION");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interview) return;

    const ok = await onSubmitEvaluation({
      interview_id: interview.interview_id,
      evaluation_score: score,
      feedback: feedbackText,
      decision,
    });
    if (ok) {
      onClose();
    }
  };

  if (!interview) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Interview Evaluation & Feedback
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Candidate Info Header */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {interview.applicant_name}
            </p>
            <p className="text-xs text-zinc-500">
              Role: <span className="font-medium text-zinc-700 dark:text-zinc-300">{interview.job_title}</span>
            </p>
          </div>

          {/* Rating Stars */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Overall Candidate Rating (1 - 5 Stars)
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  className="p-1.5 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      star <= score
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-300 dark:text-zinc-700"
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {score} / 5
              </span>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="eval-feedback" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Interview Feedback & Evaluation Notes
            </Label>
            <Textarea
              id="eval-feedback"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder="Record candidate technical competence, communication skills, culture fit, and feedback..."
              className="text-xs rounded-lg resize-none"
              required
            />
          </div>

          {/* Candidate Decision Option */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Application Decision Action (Optional)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision("NO_ACTION")}
                className={cn(
                  "py-2 px-3 text-xs font-medium rounded-lg border transition-all text-center",
                  decision === "NO_ACTION"
                    ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                )}
              >
                Keep Under Review
              </button>

              <button
                type="button"
                onClick={() => setDecision("HIRED")}
                className={cn(
                  "py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1",
                  decision === "HIRED"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                )}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Offer Hire
              </button>

              <button
                type="button"
                onClick={() => setDecision("REJECTED")}
                className={cn(
                  "py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1",
                  decision === "REJECTED"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                )}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject Candidate
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={saving} className="h-9 text-xs rounded-lg">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-9 text-xs rounded-lg bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Saving Evaluation...
                </>
              ) : (
                "Complete & Save Evaluation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
