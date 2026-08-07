"use client";

// src/modules/client/interviews/components/InterviewEvaluationModal.tsx

import React, { useState, useEffect, useMemo } from "react";
import { Interview, EvaluationFormData, AttendanceStatus } from "../types";
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
import { Award, Loader2, CheckCircle, XCircle, User, Lock } from "lucide-react";
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
  const applications = useMemo(() => interview?.applications ?? [], [interview?.applications]);
  const [selectedAppId, setSelectedAppId] = useState<number>(0);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("ATTENDED");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [decision, setDecision] = useState<"HIRED" | "REJECTED" | "NO_ACTION">("NO_ACTION");

  useEffect(() => {
    if (!open) return;
    if (applications.length > 0) {
      const first = applications[0];
      queueMicrotask(() => {
        setSelectedAppId(first.interview_application_id);
        setAttendanceStatus(first.attendance_status === "NO_SHOW" ? "NO_SHOW" : "ATTENDED");
        setFeedbackText(first.feedback || "");
      });
    }
  }, [open, interview?.interview_id, applications]);

  const activeApp = applications.find((a) => a.interview_application_id === selectedAppId) || applications[0];
  const isCompleted = Boolean(
    interview?.interview_status === "COMPLETED" ||
      interview?.interview_status === "CANCELLED" ||
      (activeApp && activeApp.attendance_status !== "PENDING")
  );

  const handleCandidateChange = (valStr: string) => {
    const targetId = Number(valStr);
    setSelectedAppId(targetId);
    const targetApp = applications.find((a) => a.interview_application_id === targetId);
    if (targetApp) {
      setAttendanceStatus(targetApp.attendance_status === "NO_SHOW" ? "NO_SHOW" : "ATTENDED");
      setFeedbackText(targetApp.feedback || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted || !selectedAppId) return;

    const ok = await onSubmitEvaluation({
      interview_application_id: selectedAppId,
      attendance_status: attendanceStatus,
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
            <Award className="h-4 w-4 text-emerald-500" />
            Candidate Interview Evaluation & Attendance
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Read-Only Notice Banner */}
          {isCompleted && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Lock className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>
                <strong>Evaluation Recorded (Read-Only View):</strong> This candidate evaluation has already been submitted and cannot be edited.
              </span>
            </div>
          )}

          {/* Candidate Selection if Multiple */}
          {applications.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Select Candidate to View / Evaluate
              </Label>
              <Select value={String(selectedAppId)} onValueChange={handleCandidateChange}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-lg">
                  <SelectValue placeholder="Select candidate..." />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.interview_application_id} value={String(app.interview_application_id)}>
                      {app.applicant_name} ({app.job_title}) — Status: {app.attendance_status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Candidate Info Header */}
          {activeApp && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  {activeApp.applicant_name}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Role: <span className="font-medium text-zinc-700 dark:text-zinc-300">{activeApp.job_title}</span>
                </p>
              </div>
            </div>
          )}

          {/* Attendance Status Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Candidate Attendance Status <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isCompleted}
                onClick={() => setAttendanceStatus("ATTENDED")}
                className={cn(
                  "py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5",
                  attendanceStatus === "ATTENDED"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500",
                  isCompleted && "cursor-not-allowed opacity-80"
                )}
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Attended Interview
              </button>

              <button
                type="button"
                disabled={isCompleted}
                onClick={() => setAttendanceStatus("NO_SHOW")}
                className={cn(
                  "py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5",
                  attendanceStatus === "NO_SHOW"
                    ? "border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500",
                  isCompleted && "cursor-not-allowed opacity-80"
                )}
              >
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                No Show (Did Not Attend)
              </button>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="eval-feedback" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Candidate Evaluation Feedback
            </Label>
            <Textarea
              id="eval-feedback"
              readOnly={isCompleted}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder={isCompleted ? "No feedback notes entered." : "Record technical competence, communication skills, culture fit, and feedback notes..."}
              className={cn("text-xs rounded-lg resize-none", isCompleted && "bg-zinc-50/80 dark:bg-zinc-900/80 cursor-default")}
              required={!isCompleted}
            />
          </div>

          {/* Candidate Decision Option */}
          {!isCompleted && (
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
          )}

          <DialogFooter className="pt-2">
            {isCompleted ? (
              <Button type="button" onClick={onClose} className="h-9 text-xs rounded-lg font-semibold ml-auto">
                Close View
              </Button>
            ) : (
              <>
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
                    "Save Candidate Evaluation"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
