"use client";

import React, { useMemo, useState } from "react";
import { UserProfile } from "@/modules/client/settings/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Phone, CheckCircle } from "lucide-react";

interface AccountSettingsProps {
  user: UserProfile | null;
  saving: boolean;
  onSave: (data: Partial<UserProfile>) => Promise<boolean>;
}

export default function AccountSettings({
  user,
  saving,
  onSave,
}: AccountSettingsProps) {
  const [overrides, setOverrides] = useState<Partial<UserProfile>>({});

  const formData = useMemo(
    () => ({
      user_fname: overrides.user_fname ?? user?.user_fname ?? "",
      user_mname: overrides.user_mname ?? user?.user_mname ?? "",
      user_lname: overrides.user_lname ?? user?.user_lname ?? "",
      user_email: user?.user_email ?? "",
      user_contact: overrides.user_contact ?? user?.user_contact ?? "",
    }),
    [user, overrides]
  );

  const handleChange = (field: keyof UserProfile, value: string) => {
    setOverrides((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSave({
      user_fname: formData.user_fname,
      user_mname: formData.user_mname,
      user_lname: formData.user_lname,
      user_contact: formData.user_contact,
    });
    if (ok) {
      setOverrides({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label htmlFor="fname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-zinc-400" /> First Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="fname"
            value={formData.user_fname}
            onChange={(e) => handleChange("user_fname", e.target.value)}
            placeholder="First Name"
            className="h-10 text-sm rounded-lg"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Middle Name <span className="text-zinc-400 font-normal">(Optional)</span>
          </Label>
          <Input
            id="mname"
            value={formData.user_mname}
            onChange={(e) => handleChange("user_mname", e.target.value)}
            placeholder="Middle Name"
            className="h-10 text-sm rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lname" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Last Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="lname"
            value={formData.user_lname}
            onChange={(e) => handleChange("user_lname", e.target.value)}
            placeholder="Last Name"
            className="h-10 text-sm rounded-lg"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-zinc-400" /> Account Email address
          </Label>
          <Input
            id="email"
            value={formData.user_email}
            disabled
            className="h-10 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800/50 cursor-not-allowed text-zinc-500"
          />
          <span className="text-[11px] text-zinc-400">Primary login email cannot be changed directly.</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-zinc-400" /> Contact Number
          </Label>
          <Input
            id="contact"
            value={formData.user_contact}
            onChange={(e) => handleChange("user_contact", e.target.value)}
            placeholder="Contact Number"
            className="h-10 text-sm rounded-lg"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          type="submit"
          disabled={saving}
          className="h-9 px-6 text-sm rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium shadow-sm transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Saving Profile...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Account Profile
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
