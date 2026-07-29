"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

interface RegisterRequiredModalProps {
  open: boolean;
  onClose: () => void;
}

export function RegisterRequiredModal({ open, onClose }: RegisterRequiredModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-bold">Authentication Required</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground max-w-sm">
            You must be logged in with a freelancer account to apply for jobs or save bookmarks. Sign up now or log in to get started!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 sm:space-x-0">
          <Button
            variant="outline"
            className="w-full sm:flex-1 rounded-xl cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:flex-1 rounded-xl cursor-pointer gap-2 border-zinc-200 dark:border-zinc-800"
          >
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Log In
            </Link>
          </Button>
          <Button
            asChild
            className="w-full sm:flex-1 rounded-xl cursor-pointer gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/signup">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
