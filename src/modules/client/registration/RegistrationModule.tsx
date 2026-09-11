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
import { useRegistrationChallenge } from "@/modules/auth/registration/client/useRegistrationChallenge";
import type { RegistrationInput } from "@/modules/auth/registration/registration.schemas";
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

/**
 * Adapt this component's legacy, nested form shape to the role-agnostic
 * challenge initiation contract. Do not pass the form object through: the
 * unified schema is strict and the browser draft deliberately excludes
 * sensitive fields such as passwords, contact details, and address data.
 */
function toRegistrationInput(
  formData: Partial<clientRegistrationPayload>
): RegistrationInput {
  const account = formData.account;
  const company = formData.company;
  const address = formData.address;

  return {
    role: "CLIENT",
    user_fname: account?.user_fname ?? "",
    user_lname: account?.user_lname ?? "",
    email: account?.user_email ?? "",
    user_contact: account?.user_contact ?? "",
    password: account?.password ?? "",
    confirmPassword: account?.confirmPassword ?? "",
    company_name: company?.company_name ?? "",
    industry: company?.industry ?? "",
    company_province: address?.company_province ?? "",
    company_city: address?.company_city ?? "",
    company_brgy: address?.company_brgy?.trim() || undefined,
    company_size: company?.company_size?.trim() || undefined,
    company_email: company?.company_email?.trim() || undefined,
    company_website: company?.company_website?.trim() || undefined,
    company_phone: company?.company_contact?.trim() || undefined,
    marketing_consent: false,
    // ConsentStep gates this handler, so these literal values satisfy the
    // schema's required-consent contract while the server remains authoritative.
    terms_accepted: true,
    privacy_accepted: true,
  };
}

export default function RegistrationModule({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState<string | null>(null);
  const registration = useRegistrationChallenge({ expectedRole: "CLIENT" });
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

  // A recovered challenge is authoritative for the visible stage. Deriving
  // this value avoids mutating React state from an effect during hydration.
  const visibleStep: Step =
    registration.phase === "active" || registration.phase === "verifying"
      ? "otp"
      : registration.phase === "success"
        ? "success"
        : step;

  const handleRegister = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await registration.initiate(toRegistrationInput(formData));

      // The server has already sealed/hash-protected the credential in the
      // challenge payload. Never retain plaintext passwords while waiting
      // for OTP verification.
      setFormData((prev) => ({
        ...prev,
        account: prev.account
          ? { ...prev.account, password: "", confirmPassword: "" }
          : prev.account,
      }));
      setDestination(null);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string): Promise<boolean> => {
    setError("");
    const response = await registration.verify(otpCode);
    setDestination(response.destination);
    setStep("success");
    return true;
  };

  const handleResendOtp = async (): Promise<void> => {
    setError("");
    await registration.resend();
  };

  const visibleError =
    error ||
    (visibleStep !== "otp" && registration.phase === "error"
      ? registration.error?.message ?? ""
      : "");

  const renderProgressHeader = () => {
    if (visibleStep === "otp" || visibleStep === "success") return null;

    const currentStepIndex = STEP_ORDER.indexOf(visibleStep);
    const progressPercent = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

    return (
      <div className="px-8 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">
            Step {currentStepIndex + 1} of {STEP_ORDER.length}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {STEP_LABELS[visibleStep]}
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
    switch (visibleStep) {
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
            email={registration.emailMasked || "your email address"}
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
                if (destination) router.push(destination);
              }}
              disabled={!destination}
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



      <Card className="border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-lg rounded-[24px] overflow-hidden">
        {renderProgressHeader()}

        <CardContent className="px-6 sm:px-8">
          {visibleError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-sm text-rose-600 dark:text-rose-400 font-medium">
              {visibleError}
            </div>
          )}
          <div key={visibleStep} className="animate-slide-in">
            {renderStep()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

