// src/modules/freelancer/freelancer-referrals/components/ReferModal.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Check, Share2, Mail, Link as LinkIcon } from "lucide-react";

interface ReferModalProps {
  jobId: number;
  jobTitle?: string;
  open: boolean;
  onClose: () => void;
}

export default function ReferModal({ jobId, jobTitle, open, onClose }: ReferModalProps) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [referralLink, setReferralLink] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Reset state on close or open
  React.useEffect(() => {
    if (open) {
      setEmail("");
      setReferralLink("");
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/freelancer/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          recipient_email: email.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create referral");
      }

      const generatedUrl = `${window.location.origin}/referral/${data.token}`;
      setReferralLink(generatedUrl);

      if (email.trim()) {
        toast.success("Referral sent!", { description: `Invitation email sent to ${email}.` });
      } else {
        toast.success("Link generated!", { description: "You can copy and share the link manually." });
      }
    } catch (err: any) {
      toast.error("Referral creation failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refer {jobTitle || "Job Opportunity"}</DialogTitle>
          <DialogDescription>
            Invite a friend or candidate to apply. You can send an invitation email via VOS Sync or copy the link directly.
          </DialogDescription>
        </DialogHeader>

        {referralLink ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>Referral token successfully created.</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Share URL</Label>
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={referralLink}
                  readOnly
                  className="bg-muted/50 text-xs truncate"
                />
                <Button onClick={handleCopy} size="icon" className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Recipient Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty to just generate a secure invite link to copy.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Generating..." : email ? "Send Email Invite" : "Generate Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
