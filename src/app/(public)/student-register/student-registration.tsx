"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RegistrationApiError } from "@/modules/auth/registration/client/registration.api";
import { useRegistrationChallenge } from "@/modules/auth/registration/client/useRegistrationChallenge";
import type { ValidStudentInvitationPreviewDto } from "@/modules/auth/student-invitation/types";

import { OtpPanel } from "./otp-panel";
import { RegistrationAccountForm, type StudentAccountInput } from "./registration-account-form";

const TERMINAL_CODES = new Set([
  "CHALLENGE_NOT_FOUND",
  "CHALLENGE_EXPIRED",
  "CHALLENGE_CANCELLED",
  "CHALLENGE_CONSUMED",
  "CHALLENGE_LOCKED",
  "PAYLOAD_INVALID",
]);

type StudentRegistrationProps = {
  readonly preview: ValidStudentInvitationPreviewDto;
  readonly loginHref: string;
  readonly onBack: () => void;
  readonly onVerified: () => Promise<void>;
};

export function StudentRegistration({ preview, loginHref, onBack, onVerified }: StudentRegistrationProps) {
  const registration = useRegistrationChallenge({ expectedRole: "FREELANCER" });
  const [showOtp, setShowOtp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (registration.role !== "FREELANCER") return;
    if (registration.phase !== "active" && registration.phase !== "verifying") return;
    queueMicrotask(() => setShowOtp(true));
  }, [registration.phase, registration.role]);

  const initiate = async (input: StudentAccountInput) => {
    setBusy(true);
    setAccountError(null);
    setOtpError(null);
    try {
      await registration.initiate(
        {
          role: "FREELANCER",
          email: input.email,
          user_fname: input.firstName,
          user_lname: input.lastName,
          user_contact: input.fullContact,
          password: input.password,
          confirmPassword: input.confirmPassword,
          country: input.country,
          employmentTypes: [],
          skills: [],
          terms_accepted: true,
          privacy_accepted: true,
          marketing_consent: false,
          turnstileToken: input.turnstileToken,
        },
        {
          role: "FREELANCER",
          step: "freelancer-otp",
          displayStep: "freelancer-otp",
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
        }
      );
      toast.success("Verification code sent", { description: "Check your personal email for the code." });
      setShowOtp(true);
      window.scrollTo(0, 0);
      return true;
    } catch (error) {
      const message = error instanceof RegistrationApiError ? error.message : "Network error. Please try again.";
      setAccountError(message);
      toast.error("Registration failed", { description: message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const verify = async (otp: string) => {
    setBusy(true);
    setOtpError(null);
    try {
      await registration.verify(otp);
      toast.success("Email verified", { description: "Now linking your school invitation." });
      await onVerified();
    } catch (error) {
      const message = error instanceof RegistrationApiError ? error.message : "Network error. Please try again.";
      if (error instanceof RegistrationApiError && TERMINAL_CODES.has(error.code)) {
        registration.clear();
        setShowOtp(false);
        setAccountError(message);
      } else {
        setOtpError(message);
      }
      toast.error("Verification failed", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const resend = async (): Promise<boolean> => {
    setBusy(true);
    setOtpError(null);
    try {
      await registration.resend();
      toast.success("New code sent", { description: "Use the latest code from your email." });
      return true;
    } catch (error) {
      const message = error instanceof RegistrationApiError ? error.message : "Network error. Please try again.";
      if (error instanceof RegistrationApiError && TERMINAL_CODES.has(error.code)) {
        registration.clear();
        setShowOtp(false);
        setAccountError(message);
      } else {
        setOtpError(message);
      }
      toast.error("Could not resend code", { description: message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await registration.cancel();
    } catch (error) {
      const ended = error instanceof RegistrationApiError && ["CHALLENGE_NOT_FOUND", "CHALLENGE_EXPIRED", "CHALLENGE_CANCELLED"].includes(error.code);
      if (!ended) {
        toast.error("Could not cancel registration", { description: error instanceof RegistrationApiError ? error.message : "Network error. Please try again." });
        setBusy(false);
        return;
      }
    }
    registration.clear();
    setShowOtp(false);
    onBack();
    setBusy(false);
  };

  if (showOtp) {
    return <OtpPanel title="Verify your personal email" emailMasked={registration.emailMasked ?? "your email address"} expiresAt={registration.expiresAt} resendAvailableAt={registration.resendAvailableAt} attemptsRemaining={registration.attemptsRemaining} acceptanceRetry={false} loading={busy} error={otpError} onSubmit={verify} onResend={resend} footer={<><span aria-hidden="true" className="text-border">&bull;</span><Button type="button" variant="ghost" disabled={busy} onClick={cancel} className="min-h-11 px-2 py-1.5 text-sm text-muted-foreground hover:text-destructive">Cancel registration</Button></>} />;
  }

  return <RegistrationAccountForm schoolName={preview.schoolName} studentFirstName={preview.studentFirstName} studentLastName={preview.studentLastName} rosterEmailMasked={preview.emailMasked} loginHref={loginHref} busy={busy} submissionError={accountError} onBack={onBack} onSubmit={initiate} />;
}
