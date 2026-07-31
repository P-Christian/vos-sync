"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Building2, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CompanyVerificationGuardProps {
  moduleName: string;
  children: React.ReactNode;
}

export default function CompanyVerificationGuard({
  moduleName,
  children,
}: CompanyVerificationGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => {
    async function checkCompanyStatus() {
      try {
        const res = await fetch("/api/client/company-profile", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const status = json.company?.verification_status ?? "DRAFT";
          setVerificationStatus(String(status).toUpperCase());
        } else {
          setVerificationStatus("DRAFT");
        }
      } catch {
        setVerificationStatus("DRAFT");
      } finally {
        setLoading(false);
      }
    }
    checkCompanyStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-16 gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
        <span className="text-sm font-medium text-zinc-400 animate-pulse">
          Verifying account status...
        </span>
      </div>
    );
  }

  const isVerified = verificationStatus === "VERIFIED";

  if (!isVerified) {
    const statusLabel =
      verificationStatus === "PENDING_VERIFICATION" || verificationStatus === "PENDING"
        ? "Under Admin Review"
        : verificationStatus === "REJECTED"
        ? "Verification Rejected"
        : verificationStatus === "SUSPENDED" || verificationStatus === "INACTIVE"
        ? "Account Inactive"
        : "Unverified / Draft";

    const statusDescription =
      verificationStatus === "PENDING_VERIFICATION" || verificationStatus === "PENDING"
        ? `Your company documents have been submitted and are currently under review by our verification team. Access to ${moduleName} will unlock as soon as your company is approved.`
        : verificationStatus === "REJECTED"
        ? "Your company verification application was rejected. Please review your company profile and resubmit valid details."
        : `You must complete your company profile and submit it for admin verification before accessing ${moduleName}.`;

    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 client-page-transition">
        <style>{`
          @keyframes page-entry {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .client-page-transition {
            animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>

        <Card className="border-2 border-amber-500/20 bg-gradient-to-b from-amber-50/80 via-white to-white dark:from-amber-950/20 dark:via-zinc-900 dark:to-zinc-900 shadow-xl rounded-3xl overflow-hidden p-6 sm:p-10">
          <CardContent className="p-0 flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 p-1.5 bg-amber-600 text-white rounded-full shadow-md">
                <ShieldAlert size={16} />
              </span>
            </div>

            <div className="space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                Status: {statusLabel}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Access Restricted: {moduleName}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
                {statusDescription}
              </p>
            </div>

            <div className="w-full max-w-md bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Building2 size={14} className="text-amber-600" /> Restricted Features for Unverified Companies:
              </h4>
              <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Job Creation & Publishing
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Candidate Profile & Applicant Review
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Direct Candidate Messaging & Interview Scheduling
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
              <Button
                onClick={() => router.push("/vos-sync/client/company-profile")}
                className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md gap-2 transition-all border-0"
              >
                Go to Company Profile <ArrowRight size={16} />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/vos-sync/client/dashboard")}
                className="w-full sm:w-auto h-12 px-6 rounded-2xl text-sm font-semibold border-zinc-300 dark:border-zinc-700"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
