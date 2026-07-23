// src/modules/vos-admin/user-management/components/UserDetailModal.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VsUser } from "../types/user.types";
import { UserStatusBadge } from "./UserStatusBadge";
import { Shield, Mail, Phone, MapPin, User, FileText, Check, X, AlertTriangle } from "lucide-react";

interface Props {
  user: VsUser | null;
  isOpen: boolean;
  onClose: () => void;
  onReview: (verificationId: number, status: 'approved' | 'rejected', rejectionNote?: string) => Promise<boolean>;
}

export function UserDetailModal({ user, isOpen, onClose, onReview }: Props) {
  const [rejectionNotes, setRejectionNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  if (!user) return null;

  const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

  const getImageUrl = (uuid: string) => {
    return `${DIRECTUS_BASE}/assets/${uuid}`;
  };

  const getRoleName = (roleId: number | null) => {
    switch (roleId) {
      case 1: return "Freelancer";
      case 2: return "Client / Employer";
      case 3: return "Admin";
      case 4: return "School Admin";
      default: return user.role || "Unknown Role";
    }
  };

  const handleAction = async (verificationId: number, status: 'approved' | 'rejected') => {
    const note = rejectionNotes[verificationId] || "";
    if (status === 'rejected' && !note.trim()) {
      alert("Please provide a rejection note.");
      return;
    }

    setSubmitting(prev => ({ ...prev, [verificationId]: true }));
    const success = await onReview(verificationId, status, note);
    setSubmitting(prev => ({ ...prev, [verificationId]: false }));

    if (success) {
      // Clear note
      setRejectionNotes(prev => {
        const copy = { ...prev };
        delete copy[verificationId];
        return copy;
      });
      // Close modal
      onClose();
    }
  };

  const verifications = user.verifications || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border shadow-lg rounded-xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            User Detail Information
          </DialogTitle>
          <DialogDescription>
            Complete information and verification details of user account.
          </DialogDescription>
        </DialogHeader>

        {/* User Base Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-300">
                {user.user_fname?.[0]}{user.user_lname?.[0]}
              </div>
              <div>
                <p className="font-bold text-lg">{user.user_fname} {user.user_mname ? `${user.user_mname} ` : ""}{user.user_lname}</p>
                <p className="text-sm text-muted-foreground">ID: #{user.user_id}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-400" />
                <span>{user.user_email}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-400" />
                <span>{user.user_contact || "No Contact Number"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-zinc-400" />
                <span className="font-semibold text-primary">{getRoleName(user.role_id)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Address Details</h3>
            <p className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300 mt-2">
              <MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
              <span>
                {[user.user_brgy, user.user_city, user.user_province].filter(Boolean).join(", ") || "No Address Information"}
              </span>
            </p>
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Status</p>
              <div className="flex gap-2 items-center mt-1">
                {user.is_blocked ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-400">Blocked</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">Active</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Identity Documents */}
        <div className="py-6 space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identity Documents Verification</h3>
          {verifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-zinc-400 border border-dashed dark:border-zinc-700 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/50">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm">No identity verification documents submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {verifications.map((v) => (
                <div key={v.id} className="border dark:border-zinc-700 rounded-xl p-4 md:p-6 bg-zinc-50/50 dark:bg-zinc-800/50 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b dark:border-zinc-700 pb-3">
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-100 uppercase text-sm tracking-wide">
                        {v.type === "gov_id" ? `GOVERNMENT ID (${v.gov_id_type || "Unknown"})` : v.type.replace("_", " ")}
                      </span>
                      <p className="text-xs text-muted-foreground">Submitted: {new Date(v.submitted_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserStatusBadge status={v.status} />
                    </div>
                  </div>

                  {/* Document Images Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {v.gov_id_front_image_uuid && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">ID Card (Front)</span>
                        <div className="border dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center h-48 relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(v.gov_id_front_image_uuid)}
                            alt="Government ID Front"
                            className="max-h-full max-w-full object-contain cursor-zoom-in"
                            onClick={() => window.open(getImageUrl(v.gov_id_front_image_uuid!), '_blank')}
                          />
                        </div>
                      </div>
                    )}
                    {v.gov_id_selfie_image_uuid && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">Selfie Image</span>
                        <div className="border dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center h-48 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(v.gov_id_selfie_image_uuid)}
                            alt="Selfie"
                            className="max-h-full max-w-full object-contain cursor-zoom-in"
                            onClick={() => window.open(getImageUrl(v.gov_id_selfie_image_uuid!), '_blank')}
                          />
                        </div>
                      </div>
                    )}
                    {v.address_doc_image_uuid && (
                      <div className="space-y-1 col-span-1 sm:col-span-2">
                        <span className="text-xs font-semibold text-muted-foreground">Address Document</span>
                        <div className="border dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center h-48 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(v.address_doc_image_uuid)}
                            alt="Address Document"
                            className="max-h-full max-w-full object-contain cursor-zoom-in"
                            onClick={() => window.open(getImageUrl(v.address_doc_image_uuid!), '_blank')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {v.rejection_note && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-red-800 dark:text-red-400 text-sm flex gap-2 items-start">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold">Rejection Note:</span> {v.rejection_note}
                      </div>
                    </div>
                  )}

                  {/* Actions for Admin Review */}
                  {v.status === 'pending' && (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase">Review Action</p>
                      <div className="flex flex-col gap-2">
                        <Input
                          placeholder="Rejection note (required for rejection)"
                          value={rejectionNotes[v.id] || ""}
                          onChange={(e) => setRejectionNotes(prev => ({ ...prev, [v.id]: e.target.value }))}
                          className="bg-white dark:bg-zinc-900 border dark:border-zinc-700 text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={submitting[v.id]}
                            onClick={() => handleAction(v.id, 'rejected')}
                            className="flex items-center gap-1.5"
                          >
                            <X className="h-4 w-4" /> Reject Document
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={submitting[v.id]}
                            onClick={() => handleAction(v.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                          >
                            <Check className="h-4 w-4" /> Approve Document
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Close Detail</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
