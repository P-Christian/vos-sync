"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  FileCheck2,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Download,
  Calendar,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
} from "lucide-react";
import { CompanyVerificationRecord } from "../types";
import { VerificationStatusBadge } from "./VerificationStatusBadge";
import { formatDate } from "../utils/companyVerification.utils";

interface CompanyVerificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyVerificationRecord | null;
  onApprove: (company: CompanyVerificationRecord) => void;
  onRequestCorrection: (company: CompanyVerificationRecord) => void;
  onReject: (company: CompanyVerificationRecord) => void;
  isSubmitting: boolean;
}

export const CompanyVerificationDetailModal: React.FC<CompanyVerificationDetailModalProps> = ({
  isOpen,
  onClose,
  company,
  onApprove,
  onRequestCorrection,
  onReject,
  isSubmitting,
}) => {
  if (!company) return null;

  const primaryOwner = company.users?.find((u) => u.is_primary_contact || u.company_user_role === "OWNER");
  const verifications = company.verifications || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-6xl w-[92vw] h-[85vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                {company.company_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                <span>Code: <strong className="font-mono">{company.company_code}</strong></span>
                <span>•</span>
                <span>Submitted: {formatDate(company.submitted_at || company.created_at)}</span>
              </DialogDescription>
            </div>
            <VerificationStatusBadge
              status={company.verification_status}
              workflowStatus={company.latest_verification?.status}
            />
          </div>
        </DialogHeader>

        {/* Tabbed Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="profile" className="gap-2 text-xs">
                <Building2 className="h-3.5 w-3.5" />
                Company Profile
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2 text-xs">
                <FileCheck2 className="h-3.5 w-3.5" />
                Documents ({company.documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2 text-xs">
                <UserCheck className="h-3.5 w-3.5" />
                Contacts & Owners
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verification Logs ({verifications.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: PROFILE */}
            <TabsContent value="profile" className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-card border rounded-lg p-4">
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-semibold">
                    Legal Name
                  </span>
                  <span className="font-semibold text-foreground text-sm">{company.company_legal_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-semibold">
                    Profile Completion
                  </span>
                  <span className="font-semibold text-foreground text-sm">{company.profile_completion_percent}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-semibold">
                    TIN (Tax Identification)
                  </span>
                  <span className="font-mono text-foreground">{company.company_tin || "Not Provided"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-semibold">
                    Registration No (SEC/DTI)
                  </span>
                  <span className="font-mono text-foreground">{company.registration_no || "Not Provided"}</span>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Address & Contact Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span>{company.company_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span>{company.company_contact}</span>
                  </div>
                  <div className="col-span-2 flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" />
                    <span>
                      {[company.company_address, company.company_brgy, company.company_city, company.company_province, company.company_zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                  {company.company_website && (
                    <div className="col-span-2 flex items-center gap-2 text-primary">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <a href={company.company_website} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                        {company.company_website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {company.internal_notes && (
                <div className="bg-muted/40 border rounded-lg p-4 space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Internal Admin Notes
                  </span>
                  <p className="text-muted-foreground">{company.internal_notes}</p>
                </div>
              )}

              {company.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-1">
                  <span className="font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Public Rejection Reason / Guidance
                  </span>
                  <p className="text-muted-foreground">{company.rejection_reason}</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: DOCUMENTS */}
            <TabsContent value="documents" className="space-y-3 text-xs">
              {!company.documents || company.documents.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  No company documents attached to this submission.
                </div>
              ) : (
                company.documents.map((doc) => (
                  <div key={doc.company_document_id} className="flex items-center justify-between border rounded-lg p-3.5 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{doc.document_name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className="font-mono uppercase bg-muted px-1.5 py-0.5 rounded text-[10px]">
                            {doc.document_type}
                          </span>
                          <span>Uploaded: {formatDate(doc.uploaded_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                        <a href={`/api/assets/${doc.directus_file_id}`} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5" />
                          View File
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB 3: CONTACTS & OWNERS */}
            <TabsContent value="contact" className="space-y-3 text-xs">
              <div className="bg-card border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Primary Account Owner / Representative
                </h4>
                {primaryOwner ? (
                  <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                    <div>
                      <span className="text-[11px] block text-muted-foreground font-semibold">Name</span>
                      <span className="text-foreground font-medium">{primaryOwner.user_fname} {primaryOwner.user_lname}</span>
                    </div>
                    <div>
                      <span className="text-[11px] block text-muted-foreground font-semibold">Email</span>
                      <span className="text-foreground font-medium">{primaryOwner.user_email}</span>
                    </div>
                    <div>
                      <span className="text-[11px] block text-muted-foreground font-semibold">Role</span>
                      <span className="text-foreground font-medium">{primaryOwner.company_user_role}</span>
                    </div>
                    <div>
                      <span className="text-[11px] block text-muted-foreground font-semibold">Status</span>
                      <span className="text-foreground font-medium">{primaryOwner.status}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No primary contact record assigned.</p>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: VERIFICATION LOGS (vs_company_verifications) */}
            <TabsContent value="history" className="space-y-3 text-xs">
              {verifications.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  No historical verification logs recorded in vs_company_verifications.
                </div>
              ) : (
                verifications.map((v) => (
                  <div key={v.id} className="border rounded-lg p-4 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Verification #{v.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-muted text-foreground">
                          {v.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Reviewed: {formatDate(v.reviewed_at || v.created_at)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t">
                      <div>
                        <span className="font-medium text-foreground">Reviewer: </span>
                        <span>{v.reviewer_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Type: </span>
                        <span>{v.verification_type}</span>
                      </div>
                      {v.public_rejection_reason && (
                        <div className="col-span-2 pt-1">
                          <span className="font-medium text-destructive block">Public Reason:</span>
                          <span className="text-muted-foreground">{v.public_rejection_reason}</span>
                        </div>
                      )}
                      {v.internal_notes && (
                        <div className="col-span-2 pt-1">
                          <span className="font-medium text-foreground block">Internal Notes:</span>
                          <span className="text-muted-foreground font-mono bg-muted/50 p-2 rounded block mt-0.5">
                            {v.internal_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Target Company ID: {company.company_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRequestCorrection(company)}
              disabled={isSubmitting}
              className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10 text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Request Correction
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onReject(company)}
              disabled={isSubmitting}
              className="text-xs"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onApprove(company)}
              disabled={isSubmitting || company.verification_status === "VERIFIED"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approve Verification
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
