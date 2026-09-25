// src/modules/school-admin/student-roster/components/InviteStudentModal.tsx
"use client";

import React, { useState } from 'react';
import { VsSchoolStudent } from '../types/student-roster.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Copy,
  Check,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: VsSchoolStudent | null;
  invitationUrl: string;
}

export function InviteStudentModal({
  isOpen,
  onClose,
  student,
  invitationUrl,
}: InviteStudentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!student) return null;

  const handleCopy = () => {
    if (!invitationUrl) return;
    navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Student Invitation Link Generated
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Share this personalized registration link with the student to activate their verified freelancer account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Student Profile Snapshot */}
          <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">
                {student.first_name} {student.last_name}
              </span>
              <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/40">
                Status: Invited
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                <span>{student.course_name || 'Enrolled Student'} ({student.school_year})</span>
              </div>
              <span>•</span>
              <span>{student.email}</span>
            </div>
          </div>

          {/* Invitation URL Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Registration & Verification URL:
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={invitationUrl}
                className="text-xs font-mono bg-muted/40 h-10 select-all"
              />
              <Button
                type="button"
                onClick={handleCopy}
                className="h-10 px-4 shrink-0 gap-1.5 text-xs font-semibold"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Once the student registers using this link, their freelancer account will be linked to your school, allowing you to refer them to partner job vacancies.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(invitationUrl, '_blank')}
            className="text-xs gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Test Link
          </Button>
          <Button type="button" onClick={onClose} className="text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
