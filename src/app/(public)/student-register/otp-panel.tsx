"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatCountdown(timestamp: string | null, now: number): string | null {
  if (!timestamp) return null;
  const remaining = Date.parse(timestamp) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface OtpPanelProps {
  title: string;
  emailMasked: string;
  expiresAt: string | null;
  resendAvailableAt: string | null;
  attemptsRemaining: number | null;
  acceptanceRetry: boolean;
  loading: boolean;
  error?: string | null;
  submitLabel?: string;
  onSubmit: (otp: string) => Promise<void> | void;
  onResend: () => Promise<boolean> | boolean;
  footer?: React.ReactNode;
}

/**
 * The 6-digit verification screen used by both the account-verification and
 * the roster-email steps. Mirrors the signup page's OTP pattern: single
 * centered mono input, live countdowns, and a resend affordance gated by the
 * server-provided resendAvailableAt timestamp.
 */
export function OtpPanel({
  title,
  emailMasked,
  expiresAt,
  resendAvailableAt,
  attemptsRemaining,
  acceptanceRetry,
  loading,
  error,
  submitLabel = "Verify",
  onSubmit,
  onResend,
  footer,
}: OtpPanelProps) {
  const [otp, setOtp] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresIn = formatCountdown(expiresAt, now);
  const resendIn = formatCountdown(resendAvailableAt, now);
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const expired = Number.isFinite(expiresAtMs) && expiresAtMs <= now;
  const locked = attemptsRemaining === 0;
  const verificationBlocked = !acceptanceRetry && (expired || locked);
  const inlineError = acceptanceRetry
    ? error
    : expired
    ? "This verification code has expired. Request a new code to continue."
    : locked
      ? "No verification attempts remain. Request a new code to continue."
      : error;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(otp);
  };

  const handleResend = async () => {
    const replacementSent = await onResend();
    if (replacementSent) setOtp("");
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-primary mb-4">{title}</h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent a 6-digit verification code to <strong>{emailMasked}</strong>. Please enter it below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          id="student-invitation-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          disabled={loading || verificationBlocked}
          placeholder="000000"
          aria-label="6-digit verification code"
          aria-invalid={Boolean(inlineError)}
          aria-describedby={inlineError ? "student-invitation-otp-error" : undefined}
          className="h-16 px-3 text-center text-2xl sm:text-3xl tracking-[0.55em] sm:tracking-[0.75em] font-mono border-2 border-border focus-visible:ring-0 focus-visible:border-primary"
        />
        {inlineError && (
          <p id="student-invitation-otp-error" role="alert" className="text-xs text-destructive font-medium">
            {inlineError}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading || verificationBlocked || otp.length !== 6}
          className="min-h-11 w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors text-lg disabled:opacity-50"
        >
          {loading ? "Verifying..." : submitLabel}
        </Button>
      </form>

      <div className="mt-5 space-y-1 text-xs text-muted-foreground">
        {attemptsRemaining !== null && <p>Attempts remaining: {attemptsRemaining}</p>}
        {expiresIn && <p>Code expires in {expiresIn}</p>}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {loading
          ? "Verification in progress."
          : resendIn
            ? "A new code can be requested when the resend countdown ends."
            : "You can request a new verification code."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm [&_button]:min-h-11 [&_a]:min-h-11">
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={loading || Boolean(resendIn)}
          className="min-h-11 border-0 bg-transparent px-2 py-1.5 font-medium text-primary shadow-none hover:bg-primary/5 hover:text-primary disabled:bg-transparent"
        >
          {resendIn ? `Resend in ${resendIn}` : "Resend code"}
        </Button>
        {footer}
      </div>
    </div>
  );
}
