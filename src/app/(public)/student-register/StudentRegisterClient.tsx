"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ValidStudentInvitationPreviewDto } from "@/modules/auth/student-invitation/types";

import { AcceptNoticeScreen, LoadingScreen, PreviewScreen, SuccessScreen } from "./invitation-screens";
import { OtpPanel } from "./otp-panel";
import {
  claimStudentInvitation,
  previewStudentInvitation,
  verifyStudentInvitation,
} from "./student-invitation.api";
import { StudentInvitationTerminalScreen } from "./terminal-screen";
import { StudentRegistration } from "./student-registration";
import { useStudentInvitationErrors } from "./use-student-invitation-errors";

type View = "loading" | "preview" | "terminal" | "register" | "notice" | "otp" | "success";

export default function StudentRegisterClient({ initialHasSession }: { readonly initialHasSession: boolean }) {
  const token = useSearchParams().get("token");
  return <StudentRegisterFlow key={token ?? "missing"} token={token} initialHasSession={initialHasSession} />;
}

function StudentRegisterFlow({ token, initialHasSession }: {
  readonly token: string | null;
  readonly initialHasSession: boolean;
}) {
  const mounted = useRef(true);
  const [view, setView] = useState<View>("loading");
  const [preview, setPreview] = useState<ValidStudentInvitationPreviewDto | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const {
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
  } = useStudentInvitationErrors(initialHasSession, setView);
  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(`/student-register?token=${token ?? ""}`)}`,
    [token]
  );
  const beganWithAuthenticatedAccount = initialHasSession;
  const finalVerificationStep = beganWithAuthenticatedAccount
    ? ({ index: 1, total: 1 } as const)
    : ({ index: 2, total: 2 } as const);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        resetInvitationErrors();
        setPreview(null);
        setNotice(null);
        setBusy(false);
        showTerminal("invalid");
      });
      return;
    }
    let active = true;
    previewStudentInvitation(token)
      .then((result) => {
        if (!active) return;
        resetInvitationErrors();
        setNotice(null);
        setBusy(false);
        if (result.state === "valid") {
          setPreview(result);
          setView("preview");
          return;
        }
        setPreview(null);
        showTerminal(result.state);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBusy(false);
        setPreview(null);
        handleInvitationError(error, "preview");
      });
    return () => {
      active = false;
    };
  }, [handleInvitationError, resetInvitationErrors, showTerminal, retryCount, token]);

  const verify = useCallback(
    async (otp?: string) => {
      if (!token) return;
      setBusy(true);
      clearOperationErrors();
      try {
        await verifyStudentInvitation(token, otp);
        if (!mounted.current) return;
        toast.success("Account linked", {
          description: `You're now linked to ${preview?.schoolName ?? "your school"}.`,
        });
        setView("success");
        window.scrollTo(0, 0);
      } catch (error) {
        if (!mounted.current) return;
        handleInvitationError(
          error,
          otp === undefined ? "same_email" : "otp",
          preview?.emailMasked
        );
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [clearOperationErrors, handleInvitationError, preview, token]
  );

  const claim = useCallback(async (preserveOtp = false): Promise<boolean> => {
    if (!token) return false;
    setBusy(true);
    clearOperationErrors();
    try {
      const result = await claimStudentInvitation(token);
      if (!mounted.current) return false;
      window.scrollTo(0, 0);
      if ("state" in result) {
        setView("success");
        return false;
      } else if (result.mode === "otp_sent") {
        showOtpChallenge(result);
        return true;
      } else {
        setNotice(result.notice);
        setView("notice");
        return false;
      }
    } catch (error) {
      if (!mounted.current) return false;
      handleInvitationError(
        error,
        preserveOtp ? "resend" : "claim",
        preview?.emailMasked
      );
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [
    clearOperationErrors,
    handleInvitationError,
    showOtpChallenge,
    preview,
    token,
  ]);

  const retryPreview = useCallback(() => {
    clearPreviewError();
    setView("loading");
    setRetryCount((value) => value + 1);
  }, [clearPreviewError]);

  if (view === "loading") {
    return (
      <LoadingScreen
        error={previewError}
        onRetry={retryPreview}
      />
    );
  }
  if (view === "terminal") return <StudentInvitationTerminalScreen variant={terminal} />;
  if (view === "success") return <SuccessScreen preview={preview} />;
  if (!preview || !token) {
    return (
      <LoadingScreen
        error="The invitation details are unavailable."
        onRetry={retryPreview}
      />
    );
  }
  if (view === "register") {
    return (
      <StudentRegistration
        preview={preview}
        token={token}
        loginHref={loginHref}
        onBack={() => setView("preview")}
        onVerified={async () => {
          markSessionAvailable();
          await claim();
        }}
      />
    );
  }
  if (view === "notice") {
    return (
      <AcceptNoticeScreen
        notice={notice}
        error={acceptError}
        busy={busy}
        step={finalVerificationStep}
        onConfirm={() => void verify()}
        onBack={() => setView("preview")}
      />
    );
  }
  if (view === "otp" && otpChallenge) {
    return (
      <OtpPanel
        title="Verify your school email"
        emailMasked={otpChallenge.emailMasked}
        expiresAt={otpChallenge.otpExpiresAt}
        resendAvailableAt={otpChallenge.resendAvailableAt}
        attemptsRemaining={attemptsRemaining}
        acceptanceRetry={otpChallenge.acceptanceRetry}
        loading={busy}
        error={otpError}
        submitLabel={otpChallenge.acceptanceRetry ? "Retry linking account" : "Link my account"}
        onSubmit={verify}
        onResend={() => claim(true)}
        step={{
          ...finalVerificationStep,
          label: "School email",
          variant: "school",
        }}
        footer={
          <>
            <p className="w-full text-sm leading-relaxed text-muted-foreground">
              This code was sent to the school email on your invitation because it differs from your signed-in account
              email.
            </p>
            <span aria-hidden="true" className="text-border">
              &bull;
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setView("preview")}
              className="h-auto px-2 py-1.5 text-sm text-muted-foreground"
            >
              Back to invitation
            </Button>
          </>
        }
      />
    );
  }
  return (
    <PreviewScreen
      preview={preview}
      hasSession={hasSession}
      loginHref={loginHref}
      busy={busy}
      onCreateAccount={() => {
        setView("register");
        window.scrollTo(0, 0);
      }}
      onAccept={() => void claim()}
    />
  );
}
