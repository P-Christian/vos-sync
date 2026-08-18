"use client";

// src/modules/client/talent-search/components/InviteDialog.tsx

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Send, Briefcase, AlertCircle, Loader2, Check, ChevronsUpDown, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface JobOption {
  job_id: number;
  job_title: string;
  status?: string;
}

interface InviteDialogProps {
  open: boolean;
  talentName: string;
  onClose: () => void;
  onSend: (message: string, jobId?: number) => Promise<void>;
  sending: boolean;
  error: string;
}

const DEFAULT_MESSAGE = (name: string) =>
  `Hi ${name.split(" ")[0]},\n\nWe came across your profile and believe you could be a great fit for an opportunity at our company.\n\nWe'd love to connect and discuss further. Please feel free to reach out or apply through our platform.\n\nBest regards,`;

export default function InviteDialog({
  open,
  talentName,
  onClose,
  onSend,
  sending,
  error,
}: InviteDialogProps) {
  const [message, setMessage] = useState(() => DEFAULT_MESSAGE(talentName));
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    async function fetchCompanyJobs() {
      setMessage(DEFAULT_MESSAGE(talentName));
      setLoadingJobs(true);
      try {
        const res = await fetch("/api/client/jobs");
        if (res.ok) {
          const json = await res.json();
          const list: JobOption[] = json.jobs ?? [];
          // Filter active jobs
          setJobs(list.filter((j) => !j.status || j.status === "ACTIVE"));
        }
      } catch {
        // Fallback silently
      } finally {
        setLoadingJobs(false);
      }
    }

    fetchCompanyJobs();
  }, [open, talentName]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSend = useCallback(async () => {
    const jobIdNum = selectedJobId && selectedJobId !== "none" ? Number(selectedJobId) : undefined;
    await onSend(message, jobIdNum);
  }, [selectedJobId, onSend, message]);

  const selectOptions = useMemo(() => [
    { value: "none", label: "General Interest (No Specific Job)" },
    ...jobs.map((j) => ({
      value: String(j.job_id),
      label: `${j.job_title} (#${j.job_id})`,
    })),
  ], [jobs]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return selectOptions;
    const q = searchQuery.toLowerCase().trim();
    return selectOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [selectOptions, searchQuery]);

  const selectedLabel = useMemo(() => {
    return selectOptions.find((opt) => opt.value === (selectedJobId || "none"))?.label || "General Interest (No Specific Job)";
  }, [selectOptions, selectedJobId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent key={talentName} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Send className="h-4 w-4 text-indigo-500" />
            Send Invitation to {talentName}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Searchable job select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Link to Company Job Posting (optional)
            </Label>
            {loadingJobs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-9 px-3 rounded-lg border border-border">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading company jobs…
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isDropdownOpen}
                  onClick={() => {
                    setIsDropdownOpen((prev) => !prev);
                    setSearchQuery("");
                  }}
                  className={cn(
                    "w-full h-9 justify-between text-xs rounded-lg border-border font-normal px-3",
                    !selectedJobId && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">{selectedLabel}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {isDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center border-b border-border px-2.5 py-1.5">
                      <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      <input
                        type="text"
                        placeholder="Search company jobs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="flex h-7 w-full rounded-md bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 overscroll-contain">
                      {filteredOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No matching jobs found.
                        </div>
                      ) : (
                        filteredOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedJobId(opt.value);
                              setIsDropdownOpen(false);
                            }}
                            className={cn(
                              "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-xs outline-none hover:bg-accent hover:text-accent-foreground text-left transition-colors",
                              (selectedJobId || "none") === opt.value && "bg-accent/50 font-medium"
                            )}
                          >
                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                              {(selectedJobId || "none") === opt.value && (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              )}
                            </span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select an open position or choose general interest invitation
            </p>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Message <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="text-sm rounded-lg resize-none"
              placeholder="Write a personalized invitation message…"
            />
            <p className="text-xs text-zinc-400">{message.length} characters</p>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="h-9 text-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            id="invite-send-btn"
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="h-9 text-sm rounded-lg gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-medium"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? "Sending…" : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
