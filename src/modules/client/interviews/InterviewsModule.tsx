// src/modules/client/interviews/InterviewsModule.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useInterviews } from "./hooks/useInterviews";
import InterviewList from "./components/InterviewList";
import InterviewForm from "./components/InterviewForm";
import InterviewStatusBadge from "./components/InterviewStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, CalendarPlus, CalendarDays } from "lucide-react";
import { Interview, InterviewFormData, InterviewStatus, INTERVIEW_STATUS_LABELS } from "./types";

export default function InterviewsModule() {
  const {
    interviews,
    loading,
    saving,
    error,
    successMessage,
    fetchInterviews,
    createInterview,
    updateInterviewStatus,
    EMPTY_FORM,
    clearMessages,
  } = useInterviews();

  const [filterStatus, setFilterStatus] = useState<InterviewStatus | "ALL">("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [formData, setFormData] = useState<InterviewFormData>(EMPTY_FORM);
  const [newStatus, setNewStatus] = useState<InterviewStatus>("CONFIRMED");
  const [statusNotes, setStatusNotes] = useState("");

  useEffect(() => {
    fetchInterviews(filterStatus);
  }, [fetchInterviews, filterStatus]);

  const handleFieldChange = (field: keyof InterviewFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const ok = await createInterview(formData);
    if (ok) {
      setCreateDialogOpen(false);
      setFormData(EMPTY_FORM);
    }
  };

  const handleUpdateStatus = (interview: Interview) => {
    setSelectedInterview(interview);
    setNewStatus(interview.interview_status as InterviewStatus);
    setStatusNotes("");
    clearMessages();
    setUpdateDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedInterview) return;
    const ok = await updateInterviewStatus(
      selectedInterview.interview_id,
      newStatus,
      statusNotes
    );
    if (ok) setUpdateDialogOpen(false);
  };

  const upcomingCount = interviews.filter(
    (iv) => iv.interview_status === "CONFIRMED" || iv.interview_status === "RESCHEDULED"
  ).length;

  return (
    <div className="space-y-6 client-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-indigo-950 via-zinc-900 to-neutral-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Interview Schedule</h1>
            <p className="text-sm text-zinc-300 mt-1">
              {upcomingCount} upcoming &bull; {interviews.length} total
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setFormData(EMPTY_FORM);
            clearMessages();
            setCreateDialogOpen(true);
          }}
          className="relative z-10 h-10 bg-primary hover:bg-primary/90 rounded-xl text-sm font-medium gap-1.5 w-full sm:w-auto shadow-md shadow-primary/20 border-0"
        >
          <CalendarPlus className="h-4 w-4" />
          Schedule Interview
        </Button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}
      {error && !createDialogOpen && !updateDialogOpen && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filter + List */}
      <Card className="shadow-lg border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            All Interviews
          </CardTitle>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as InterviewStatus | "ALL")}
          >
            <SelectTrigger className="h-8 w-40 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">All Statuses</SelectItem>
              {(Object.entries(INTERVIEW_STATUS_LABELS) as [InterviewStatus, string][]).map(
                ([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-zinc-400 animate-pulse">Loading interviews...</span>
            </div>
          ) : (
            <InterviewList interviews={interviews} onUpdateStatus={handleUpdateStatus} />
          )}
        </CardContent>
      </Card>

      {/* Create Interview Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Schedule New Interview</DialogTitle>
          </DialogHeader>
          {error && createDialogOpen && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          <InterviewForm data={formData} onChange={handleFieldChange} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving} className="h-9 text-sm rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="h-9 text-sm rounded-lg gap-1.5">
              {saving ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Update Interview Status</DialogTitle>
            {selectedInterview && (
              <p className="text-xs text-zinc-500 mt-1">
                {selectedInterview.applicant_name ?? `Application #${selectedInterview.application_id}`}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && updateDialogOpen && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
              <span className="text-xs text-zinc-500">Current:</span>
              {selectedInterview && (
                <InterviewStatusBadge status={selectedInterview.interview_status as InterviewStatus} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                New Status <span className="text-rose-500">*</span>
              </Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as InterviewStatus)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(INTERVIEW_STATUS_LABELS) as [InterviewStatus, string][]).map(
                    ([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-notes" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Notes (optional)
              </Label>
              <Textarea
                id="status-notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                placeholder="Any notes about this status change..."
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)} disabled={saving} className="h-9 text-sm rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleSaveStatus} disabled={saving} className="h-9 text-sm rounded-lg">
              {saving ? "Saving..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

