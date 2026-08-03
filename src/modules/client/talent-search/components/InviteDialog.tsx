"use client";

// src/modules/client/talent-search/components/InviteDialog.tsx

import { useState } from "react";
import { Send, Briefcase, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [jobId, setJobId] = useState("");

  const handleSend = async () => {
    await onSend(message, jobId ? Number(jobId) : undefined);
  };

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
          {/* Optional job ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Link to Job Posting (optional)
            </Label>
            <Input
              id="invite-job-id"
              placeholder="Job ID (e.g. 12)"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="h-9 text-sm rounded-lg"
            />
            <p className="text-xs text-zinc-400">
              Leave blank to send a general interest invitation
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
