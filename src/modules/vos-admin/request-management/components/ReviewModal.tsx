// src/modules/vos-admin/request-management/components/ReviewModal.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReviewAction } from "../types/request.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'Approve' | 'Reject' | null;
  requestType: 'School' | 'Course';
  onSubmit: (data: ReviewAction) => Promise<boolean>;
}

export function ReviewModal({ open, onOpenChange, action, requestType, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [matchedId, setMatchedId] = useState<string>("");

  const handleSubmit = async () => {
    if (action === 'Reject' && !remarks.trim()) {
      toast.error("Admin remarks are required when rejecting.");
      return;
    }
    if (action === 'Approve' && !matchedId.trim()) {
      toast.error(`A valid matched ${requestType.toLowerCase()} ID is required to approve.`);
      return;
    }

    setLoading(true);
    
    const payload: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = {
      action: action === 'Approve' ? 'Approved' : 'Rejected',
      admin_remarks: remarks,
    };
    
    if (action === 'Approve') {
      if (requestType === 'School') {
        payload.matched_school_id = parseInt(matchedId, 10);
      } else {
        payload.matched_school_course_id = parseInt(matchedId, 10);
      }
    }

    const success = await onSubmit(payload);
    setLoading(false);

    if (success) {
      toast.success(`Request ${action === 'Approve' ? 'approved' : 'rejected'} successfully.`);
      setRemarks("");
      setMatchedId("");
      onOpenChange(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{action === 'Approve' ? 'Approve' : 'Reject'} {requestType} Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {action === 'Approve' ? (
            <div className="space-y-2">
              <Label>Matched {requestType} ID (Required)</Label>
              <p className="text-sm text-muted-foreground">
                Enter the ID of the official {requestType.toLowerCase()} record this request maps to.
              </p>
              <Input 
                type="number"
                placeholder={`Enter ${requestType.toLowerCase()} ID`}
                value={matchedId}
                onChange={e => setMatchedId(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Admin Remarks (Required)</Label>
              <p className="text-sm text-muted-foreground">
                Provide a reason for rejecting this request.
              </p>
              <Textarea 
                placeholder="Reason for rejection..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant={action === 'Approve' ? 'default' : 'destructive'}
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? "Processing..." : `Confirm ${action}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
