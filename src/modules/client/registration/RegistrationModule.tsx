// src/modules/client/registration/RegistrationModule.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AccountInfoStep from "./components/AccountInfoStep";
import CompanyInfoStep from "./components/CompanyInfoStep";
import AddressInfoStep from "./components/AddressInfoStep";
import ConsentStep from "./components/ConsentStep";
import OtpVerificationStep from "./components/OtpVerificationStep";
import { clientRegistrationPayload } from "./types";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Step = "account" | "company" | "address" | "consent" | "otp" | "success";

const STEP_ORDER: Step[] = ["account", "company", "address", "consent"];

const STEP_LABELS: Record<string, string> = {
  account: "Account Information",
  company: "Company Profile Details",
  address: "Corporate Address",
  consent: "Agreements & Consent",
};

export default function RegistrationModule({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Partial<clientRegistrationPayload>>({
    account: {
      user_fname: "",
      user_mname: "",
      user_lname: "",
      suffix_name: "",
      user_email: "",
      user_contact: "",
      password: "",
      confirmPassword: "",
    },
    company: {
      company_name: "",
      company_email: "",
      company_contact: "",
      industry: "",
      business_type: "",
      company_size: "",
      company_website: "",
      company_description: "",
    },
    address: {
      company_province: "",
      company_city: "",
      company_brgy: "",
      company_address: "",
      company_zipCode: "",
    },
    terms_accepted: false,
    privacy_accepted: false,
  });

  const updateFields = (fields: Partial<clientRegistrationPayload>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleRegister = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/client/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed. Please check your inputs.");
      }

      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string): Promise<boolean> => {
    setError("");
    try {
      const response = await fetch("/api/client/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.account?.user_email,
          otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed.");
      }

      setStep("success");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      return false;
    }
  };

  const handleResendOtp = async () => {
    setError("");
    try {
      const response = await fetch("/api/client/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resend OTP.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred resending OTP.");
      throw err;
    }
  };

  const renderProgressHeader = () => {
    if (step === "otp" || step === "success") return null;

    const currentStepIndex = STEP_ORDER.indexOf(step);
    const progressPercent = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

    return (
      <div className="px-8 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
            Step {currentStepIndex + 1} of {STEP_ORDER.length}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {STEP_LABELS[step]}
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case "account":
        return (
          <AccountInfoStep
            formData={formData}
            updateFields={updateFields}
            onNext={() => setStep("company")}
            onBack={onBack}
          />
        );
      case "company":
        return (
          <CompanyInfoStep
            formData={formData}
            updateFields={updateFields}
            onNext={() => setStep("address")}
            onBack={() => setStep("account")}
          />
        );
      case "address":
        return (
          <AddressInfoStep
            formData={formData}
            updateFields={updateFields}
            onNext={() => setStep("consent")}
            onBack={() => setStep("company")}
          />
        );
      case "consent":
        return (
          <ConsentStep
            formData={formData}
            updateFields={updateFields}
            onNext={handleRegister}
            onBack={() => setStep("address")}
            isSubmitting={isSubmitting}
          />
        );
      case "otp":
        return (
          <OtpVerificationStep
            email={formData.account?.user_email || ""}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />
        );
      case "success":
        return (
          <div className="text-center py-6 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Registration Complete</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Your client account has been successfully registered. Note that company verification status is currently <span className="font-semibold text-zinc-800 dark:text-zinc-200">PENDING</span> admin approval.
              </p>
            </div>

            <Button
              onClick={() => {
                router.push("/vos-sync/client/dashboard");
              }}
              className="w-full max-w-xs h-11 bg-primary text-white hover:bg-primary/95 font-medium rounded-lg text-base"
            >
              Go to Dashboard
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 relative overflow-visible">
      {/* Background radial gradient blobs for SaaS look */}
      <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-primary/8 blur-[90px] pointer-events-none dark:bg-primary/4" />
      <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-indigo-500/8 blur-[90px] pointer-events-none dark:bg-indigo-500/4" />



      <Card className="border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_20px_50px_-12px_rgba(99,102,241,0.06)] bg-white/75 dark:bg-zinc-950/75 backdrop-blur-xl rounded-[24px] overflow-hidden">
        {renderProgressHeader()}

        <CardContent className="px-6 sm:px-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-sm text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}
          <div key={step} className="animate-slide-in">
            {renderStep()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

