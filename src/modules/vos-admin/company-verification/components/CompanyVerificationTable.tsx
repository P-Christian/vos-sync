"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, FileCheck, Building } from "lucide-react";
import { CompanyVerificationRecord } from "../types";
import { VerificationStatusBadge } from "./VerificationStatusBadge";
import { formatDate } from "../utils/companyVerification.utils";

interface CompanyVerificationTableProps {
  records: CompanyVerificationRecord[];
  loading: boolean;
  onSelectCompany: (company: CompanyVerificationRecord) => void;
}

export const CompanyVerificationTable: React.FC<CompanyVerificationTableProps> = ({
  records,
  loading,
  onSelectCompany,
}) => {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
        <p className="text-sm font-medium">Loading company verification queue...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
        <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <h4 className="text-base font-semibold text-foreground">No verification records found</h4>
        <p className="text-sm text-muted-foreground mt-1">
          There are currently no company submissions matching your filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Company Details</TableHead>
            <TableHead className="font-semibold">Legal & Registration</TableHead>
            <TableHead className="font-semibold">Documents</TableHead>
            <TableHead className="font-semibold">Submitted At</TableHead>
            <TableHead className="font-semibold">Completion %</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-right font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((company) => {
            const docCount = company.documents?.length || 0;
            return (
              <TableRow key={company.company_id} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary/70 shrink-0" />
                      {company.company_name}
                    </div>
                    <div className="text-xs text-muted-foreground pl-6">
                      Code: {company.company_code}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-0.5">
                    <div className="text-foreground font-medium">{company.company_legal_name}</div>
                    <div className="text-muted-foreground">
                      TIN: <span className="font-mono">{company.company_tin || "N/A"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Reg No: <span className="font-mono">{company.registration_no || "N/A"}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileCheck className="h-3.5 w-3.5 text-primary" />
                    <span>{docCount} file(s)</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(company.submitted_at || company.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, company.profile_completion_percent)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {company.profile_completion_percent}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <VerificationStatusBadge
                    status={company.verification_status}
                    workflowStatus={company.latest_verification?.status}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectCompany(company)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
