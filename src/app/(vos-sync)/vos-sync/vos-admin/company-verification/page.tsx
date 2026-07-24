import React from "react";
import CompanyVerificationModule from "@/modules/vos-admin/company-verification";

export const metadata = {
  title: "Company Verification | VOS Sync Admin",
  description: "Manage company verification requests, review legal documents, and approve employer accounts.",
};

export default function CompanyVerificationPage() {
  return <CompanyVerificationModule />;
}
