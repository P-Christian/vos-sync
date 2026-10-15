"use client";

// src/modules/client/settings/components/SecuritySettings.tsx

import React, { useState } from "react";
import { SecurityPayload } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, KeyRound, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { validatePasswordStrict } from "@/lib/password-validation";
import PasswordRequirementsChecklist from "@/components/auth/PasswordRequirementsChecklist";
import { ConnectedAccountsCard } from "@/modules/auth/components/ConnectedAccountsCard";

interface SecuritySettingsProps {
  saving: boolean;
  onChangePassword: (payload: SecurityPayload) => Promise<boolean>;
}

export default function SecuritySettings({
  saving,
  onChangePassword,
}: SecuritySettingsProps) {
  const [form, setForm] = useState<SecurityPayload>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [localError, setLocalError] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!form.current_password) {
      setLocalError("Current password is required.");
      return;
    }
    if (!form.new_password || !validatePasswordStrict(form.new_password)) {
      setLocalError("New password does not meet all security requirements.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setLocalError("New password and confirm password do not match.");
      return;
    }

    setShowLogoutDialog(true);
  };

  const executePasswordChange = async (revokeOthers: boolean) => {
    try {
      setDialogLoading(true);
      const payload: SecurityPayload = {
        ...form,
        revoke_other_sessions: revokeOthers,
      };

      const ok = await onChangePassword(payload);
      if (ok) {
        setForm({ current_password: "", new_password: "", confirm_password: "" });
        setShowLogoutDialog(false);
        if (revokeOthers) {
          toast.success("Password changed. All other device sessions were signed out.");
        } else {
          toast.success("Password changed successfully.");
        }
      }
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Left Column: Password Management */}
      <div className="space-y-5">
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Account Password & Security
            </h4>
            <p className="text-sm md:text-xs text-muted-foreground mt-0.5">
              Ensure your account uses a strong, unique password with at least 8 characters. Changing your credentials requires verifying your current password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {localError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm md:text-xs">
              {localError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="curr-pass" className="text-sm md:text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Current Password
            </Label>
            <Input
              id="curr-pass"
              type="password"
              value={form.current_password}
              onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
              placeholder="••••••••"
              className="h-10 md:text-sm rounded-xl max-md:h-10 max-md:text-base"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pass" className="text-sm md:text-xs font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> New Password
            </Label>
            <Input
              id="new-pass"
              type="password"
              value={form.new_password}
              onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
              placeholder="Min. 8 characters"
              className="h-10 md:text-sm rounded-xl max-md:h-10 max-md:text-base"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conf-pass" className="text-sm md:text-xs font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Confirm New Password
            </Label>
            <Input
              id="conf-pass"
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
              placeholder="Re-enter new password"
              className="h-10 md:text-sm rounded-xl max-md:h-10 max-md:text-base"
              required
            />
          </div>

          <PasswordRequirementsChecklist password={form.new_password || ""} confirmPassword={form.confirm_password} />

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving || !validatePasswordStrict(form.new_password || "")}
              className="h-10 px-6 text-sm rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column: Connected Accounts & Social Logins */}
      <div className="w-full">
        <ConnectedAccountsCard returnTo="/vos-sync/client/settings" />
      </div>

      {/* Choice B Password Change Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-xl p-6 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-foreground">
              Log Out of Other Devices?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Would you like to sign out of all other devices and browser sessions? You will stay logged in on this device.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              type="button"
              onClick={() => executePasswordChange(true)}
              disabled={dialogLoading || saving}
              className="w-full rounded-full bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              {dialogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log Out Other Devices (Recommended)
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => executePasswordChange(false)}
              disabled={dialogLoading || saving}
              className="w-full rounded-full border border-primary/20 bg-card/70 hover:bg-primary/10 font-medium"
            >
              Keep Other Devices Logged In
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowLogoutDialog(false)}
              disabled={dialogLoading || saving}
              className="w-full rounded-full text-muted-foreground hover:text-foreground text-xs"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
