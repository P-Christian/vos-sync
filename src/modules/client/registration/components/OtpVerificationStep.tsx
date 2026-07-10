// src/modules/client/registration/components/OtpVerificationStep.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Mail, ArrowRight, RotateCw } from "lucide-react";

interface OtpVerificationStepProps {
  email: string;
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => Promise<void>;
}

export default function OtpVerificationStep({ email, onVerify, onResend }: OtpVerificationStepProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setIsVerifying(true);
    try {
      const success = await onVerify(code);
      if (!success) {
        setError("Invalid verification code or code has expired. Please try again.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed. Please check your connection.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendStatus("");
    setIsResending(true);
    try {
      await onResend();
      setResendStatus("A new OTP code has been successfully sent to your email.");
      setTimeout(() => setResendStatus(""), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-6 flex flex-col items-center text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
        <Mail className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Verify your email</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          We sent a verification code to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>. Please enter the 6-digit code below.
        </p>
      </div>

      <div className="space-y-2">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(val) => {
            setCode(val);
            if (error) setError("");
          }}
          className="mx-auto"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
            <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
            <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
            <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
            <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {resendStatus && <p className="text-xs text-emerald-600 font-medium">{resendStatus}</p>}
      </div>

      <div className="w-full space-y-3 pt-2">
        <Button
          type="submit"
          disabled={code.length < 6 || isVerifying}
          className="w-full h-11 bg-primary text-white hover:bg-primary/95 font-medium rounded-lg text-base flex items-center justify-center gap-2"
        >
          {isVerifying ? "Verifying..." : "Verify Code"}
          <ArrowRight className="h-5 w-5" />
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-sm text-primary font-semibold hover:underline flex items-center justify-center gap-1 mx-auto disabled:text-zinc-400"
        >
          {isResending ? (
            <RotateCw className="h-4 w-4 animate-spin" />
          ) : (
            "Resend verification code"
          )}
        </button>
      </div>
    </form>
  );
}

