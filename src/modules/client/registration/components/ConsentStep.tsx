// src/modules/client/registration/components/ConsentStep.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { RegistrationStepProps } from "../types";

export default function ConsentStep({ formData, updateFields, onNext, onBack }: RegistrationStepProps & { isSubmitting: boolean }) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const termsAccepted = formData.terms_accepted || false;
  const privacyAccepted = formData.privacy_accepted || false;

  const handleTermsChange = (checked: boolean) => {
    updateFields({ terms_accepted: checked });
    if (checked && errors.terms) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.terms;
        return next;
      });
    }
  };

  const handlePrivacyChange = (checked: boolean) => {
    updateFields({ privacy_accepted: checked });
    if (checked && errors.privacy) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.privacy;
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!termsAccepted) newErrors.terms = "You must accept the Terms of Service to continue.";
    if (!privacyAccepted) newErrors.privacy = "You must accept the Privacy Policy to continue.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in">
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
        <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">Legal Agreement Summary</h4>
        <p>
          By creating an client Account on VOS Sync, you represent that you are an authorized representative of the company described and have the authority to act on its behalf.
        </p>
        <p>
          Your account credentials will enable login, while your company information will undergo a verification process. Job posting privileges will remain locked until your company receives administrative approval.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms-agree"
            checked={termsAccepted}
            onCheckedChange={(checked) => handleTermsChange(!!checked)}
            className="mt-1"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms-agree"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer select-none"
            >
              I understand and agree to the{" "}
              <Link href="/terms-of-service" target="_blank" className="text-primary hover:underline font-semibold">
                VOS Sync Terms of Service
              </Link>
              .
            </label>
            <p className="text-xs text-muted-foreground">
              Includes service conditions, intellectual property rules, and limitation of liability.
            </p>
            {errors.terms && <p className="text-xs text-rose-500 font-medium mt-1">{errors.terms}</p>}
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="privacy-agree"
            checked={privacyAccepted}
            onCheckedChange={(checked) => handlePrivacyChange(!!checked)}
            className="mt-1"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="privacy-agree"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer select-none"
            >
              I accept the{" "}
              <Link href="/privacy-policy" target="_blank" className="text-primary hover:underline font-semibold">
                Privacy Policy
              </Link>{" "}
              and consent to data processing.
            </label>
            <p className="text-xs text-muted-foreground">
              Outlines how we gather, protect, and share candidates and company profile data.
            </p>
            {errors.privacy && <p className="text-xs text-rose-500 font-medium mt-1">{errors.privacy}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} className="w-1/3 h-11">
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={!termsAccepted || !privacyAccepted}
          className="flex-1 h-11 bg-primary text-white hover:bg-primary/95 font-medium rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Confirm & Register
        </Button>
      </div>
    </form>
  );
}

