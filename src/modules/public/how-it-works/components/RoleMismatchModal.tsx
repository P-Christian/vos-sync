// src/modules/public/how-it-works/components/RoleMismatchModal.tsx
"use client";

import React from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface MismatchState {
  isOpen: boolean;
  currentRole: string;
  targetRoleLabel: string;
  targetRoute: string;
}

interface Props {
  state: MismatchState;
  onClose: () => void;
  onConfirmSignOut: () => void;
  loading?: boolean;
}

export function RoleMismatchModal({
  state,
  onClose,
  onConfirmSignOut,
  loading = false,
}: Props) {
  return (
    <Dialog open={state.isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3 text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            You're currently signed in as {state.currentRole}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            <strong className="text-foreground">{state.targetRoleLabel}</strong> accounts use a separate registration role and cannot be created under your active account. Please sign out before registering a {state.targetRoleLabel} account.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirmSignOut}
            disabled={loading}
            className="w-full sm:w-auto font-bold gap-2 cursor-pointer shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            {loading ? "Signing Out..." : `Sign Out & Register ${state.targetRoleLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
