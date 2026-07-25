import { CompanyVerificationRecord, CompanyVerificationKPIs, VerificationStatus } from "../types";

export function calculateCompanyKPIs(records: CompanyVerificationRecord[]): CompanyVerificationKPIs {
  return {
    totalCount: records.length,
    pendingCount: records.filter(r => r.verification_status === "PENDING_VERIFICATION").length,
    verifiedCount: records.filter(r => r.verification_status === "VERIFIED").length,
    rejectedCount: records.filter(r => r.verification_status === "REJECTED").length,
  };
}

export function filterCompanyRecords(
  records: CompanyVerificationRecord[],
  status: string,
  search: string
): CompanyVerificationRecord[] {
  return records.filter(record => {
    // Status filter
    if (status && status !== "ALL") {
      const matchCompStatus = record.verification_status === status;
      const matchVerifStatus = record.latest_verification?.status === status;
      if (!matchCompStatus && !matchVerifStatus) return false;
    }

    // Search query filter (company name, legal name, code, TIN, registration no, email)
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      const matchName = record.company_name?.toLowerCase().includes(query);
      const matchLegal = record.company_legal_name?.toLowerCase().includes(query);
      const matchCode = record.company_code?.toLowerCase().includes(query);
      const matchTin = record.company_tin?.toLowerCase().includes(query);
      const matchReg = record.registration_no?.toLowerCase().includes(query);
      const matchEmail = record.company_email?.toLowerCase().includes(query);

      if (!matchName && !matchLegal && !matchCode && !matchTin && !matchReg && !matchEmail) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Derives user-friendly display labels based on dual-status lifecycle:
 *
 * vs_company.verification_status + vs_company_verifications.status -> Display
 * PENDING_VERIFICATION + PENDING_VERIFICATION -> Pending Verification
 * PENDING_VERIFICATION + IN_REVIEW            -> Pending: Under Review
 * PENDING_VERIFICATION + CORRECTION_REQUIRED  -> Pending: Correction Required
 * VERIFIED             + APPROVED             -> Verified
 * REJECTED             + REJECTED             -> Rejected
 * SUSPENDED            + SUSPENDED            -> Suspended
 */
export function formatDualStatusLabel(
  companyStatus: VerificationStatus | string,
  workflowStatus?: string | null
): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
} {
  const cStatus = (companyStatus || "").toUpperCase();
  const wStatus = (workflowStatus || "").toUpperCase();

  // 1. Final States
  if (cStatus === "VERIFIED" || wStatus === "APPROVED") {
    return { label: "Verified", variant: "success" };
  }
  if (cStatus === "REJECTED" || wStatus === "REJECTED") {
    return { label: "Rejected", variant: "destructive" };
  }
  if (cStatus === "SUSPENDED" || wStatus === "SUSPENDED") {
    return { label: "Suspended", variant: "destructive" };
  }

  // 2. Pending Workflow States
  if (wStatus === "CORRECTION_REQUIRED") {
    return { label: "Pending: Correction Required", variant: "warning" };
  }
  if (wStatus === "IN_REVIEW") {
    return { label: "Pending: Under Review", variant: "secondary" };
  }
  if (cStatus === "PENDING_VERIFICATION" || wStatus === "PENDING_VERIFICATION") {
    return { label: "Pending Verification", variant: "warning" };
  }

  if (cStatus === "INACTIVE") {
    return { label: "Inactive", variant: "outline" };
  }

  return { label: "Draft", variant: "outline" };
}

export function getStatusBadgeVariant(status: VerificationStatus | string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
} {
  return formatDualStatusLabel(status);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}
