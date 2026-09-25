// src/modules/school-admin/job-referrals/components/ReferralHistoryDrawer.tsx
"use client";

import React, { useState } from 'react';
import { useJobReferralsContext } from '../providers/JobReferralsProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Copy,
  Check,
  Briefcase,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

export function ReferralHistoryDrawer() {
  const { isHistoryOpen, setIsHistoryOpen, referrals } = useJobReferralsContext();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyLink = (id: number, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLAIMED':
      case 'APPLIED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[10px]">
            {status}
          </Badge>
        );
      case 'SENT':
      case 'CREATED':
        return (
          <Badge variant="outline" className="text-primary border-primary/40 text-[10px]">
            {status}
          </Badge>
        );
      case 'DECLINED':
      case 'REVOKED':
      case 'EXPIRED':
        return (
          <Badge variant="secondary" className="text-muted-foreground text-[10px]">
            {status}
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-1 pb-4 border-b">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <SheetTitle className="text-lg font-bold">Referral History</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Track student invitations and candidate applications referred by your institution.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-3">
          {referrals.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Briefcase className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">No referrals created yet.</p>
              <p className="text-xs text-muted-foreground/70">
                Browse active job vacancies and click &ldquo;Refer Students&rdquo; to begin.
              </p>
            </div>
          ) : (
            referrals.map((r) => {
              const isCopied = copiedId === r.referral_id;
              return (
                <div
                  key={r.referral_id}
                  className="p-3.5 rounded-lg border border-border/80 bg-card space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                        {r.job_title || `Job #${r.job_id}`}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {r.company_name || 'Partner Company'}
                      </p>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.display_hint && (
                      <span className="font-mono text-[11px]">{r.display_hint}</span>
                    )}
                  </div>

                  {r.referral_url && (
                    <div className="flex items-center justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(r.referral_id, r.referral_url)}
                        className="text-xs h-7 gap-1 text-primary"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? 'Link Copied' : 'Copy Link'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
