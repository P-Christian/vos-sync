"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import type { StudentInvitationOtpSentClaimDto } from "@/modules/auth/student-invitation/types";

import {
  routeStudentInvitationError,
  type StudentInvitationErrorSurface,
  type StudentInvitationOtpView,
} from "./student-invitation-error-routing";
import type { StudentInvitationTerminalVariant } from "./terminal-screen";

type InvitationView = "loading" | "preview" | "terminal" | "register" | "notice" | "otp" | "success";

export function useStudentInvitationErrors(
  initialHasSession: boolean,
  setView: Dispatch<SetStateAction<InvitationView>>
) {
  const [terminal, setTerminal] = useState<StudentInvitationTerminalVariant>("invalid");
  const [hasSession, setHasSession] = useState(initialHasSession);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<StudentInvitationOtpView | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const handleInvitationError = useCallback((
    error: unknown,
    surface: StudentInvitationErrorSurface,
    emailMasked?: string
  ): void => {
    const route = routeStudentInvitationError(error, surface);
    switch (route.kind) {
      case "terminal":
        setTerminal(route.variant);
        setView("terminal");
        return;
      case "sign_in":
        setHasSession(false);
        setView("preview");
        toast.error("Session expired", { description: "Please sign in again to continue." });
        return;
      case "otp":
        setAttemptsRemaining(route.attemptsRemaining);
        setOtpError(route.message);
        setOtpChallenge((current) => ({
          emailMasked: current?.emailMasked ?? emailMasked ?? "your school email",
          otpExpiresAt: route.acceptanceRetry ? null : current?.otpExpiresAt ?? null,
          resendAvailableAt: route.resendAvailableAt ?? current?.resendAvailableAt ?? null,
          acceptanceRetry: route.acceptanceRetry,
        }));
        setView("otp");
        return;
      case "preview_retry":
        setPreviewError(route.message);
        setView("loading");
        return;
      case "claim_retry":
        setView("preview");
        toast.error("Could not start verification", { description: route.message });
        return;
      case "same_email_retry":
        setAcceptError(route.message);
        return;
      case "otp_retry":
        setOtpError(route.message);
        if (route.resendAvailableAt) {
          setOtpChallenge((current) => current
            ? { ...current, resendAvailableAt: route.resendAvailableAt }
            : current);
        }
        return;
      default:
        return assertNever(route);
    }
  }, [setView]);

  const showOtpChallenge = useCallback((challenge: StudentInvitationOtpSentClaimDto): void => {
    setOtpChallenge({ ...challenge, acceptanceRetry: false });
    setAttemptsRemaining(challenge.attemptsRemaining);
    setView("otp");
  }, [setView]);

  const resetInvitationErrors = useCallback((): void => {
    setPreviewError(null);
    setAcceptError(null);
    setOtpError(null);
    setOtpChallenge(null);
    setAttemptsRemaining(null);
  }, []);

  const clearPreviewError = useCallback((): void => setPreviewError(null), []);
  const clearOperationErrors = useCallback((): void => {
    setAcceptError(null);
    setOtpError(null);
  }, []);
  const markSessionAvailable = useCallback((): void => setHasSession(true), []);
  const showTerminal = useCallback((variant: StudentInvitationTerminalVariant): void => {
    setTerminal(variant);
    setView("terminal");
  }, [setView]);

  return {
    terminal,
    hasSession,
    previewError,
    acceptError,
    otpError,
    otpChallenge,
    attemptsRemaining,
    handleInvitationError,
    showOtpChallenge,
    resetInvitationErrors,
    clearPreviewError,
    clearOperationErrors,
    markSessionAvailable,
    showTerminal,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled invitation error route: ${String(value)}`);
}
