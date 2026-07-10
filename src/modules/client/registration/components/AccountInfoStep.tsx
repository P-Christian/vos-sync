// src/modules/client/registration/components/AccountInfoStep.tsx
import React, { useState } from "react";
import { Input as CustomInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RegistrationStepProps } from "../types";
import { Eye, EyeOff, User, Mail, Phone, Lock } from "lucide-react";

export default function AccountInfoStep({ formData, updateFields, onNext, onBack }: RegistrationStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const account = formData.account || {
    user_fname: "",
    user_mname: "",
    user_lname: "",
    suffix_name: "",
    user_email: "",
    user_contact: "",
    password: "",
    confirmPassword: "",
  };

  const handleChange = (field: string, value: string) => {
    updateFields({
      account: {
        ...account,
        [field]: value,
      },
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleValidation = () => {
    const newErrors: Record<string, string> = {};
    if (!account.user_fname.trim()) newErrors.user_fname = "First name is required";
    if (!account.user_lname.trim()) newErrors.user_lname = "Last name is required";
    if (!account.user_email.trim()) {
      newErrors.user_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.user_email)) {
      newErrors.user_email = "Invalid email format";
    }
    if (!account.user_contact.trim()) {
      newErrors.user_contact = "Contact number is required";
    }
    if (!account.password) {
      newErrors.password = "Password is required";
    } else if (account.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (account.password !== account.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleValidation()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in">
      {/* SECTION 1: Personal Profile */}
      <div className="space-y-4">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Contact Particulars</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">First Name *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <CustomInput
                type="text"
                placeholder="John"
                value={account.user_fname}
                onChange={(e) => handleChange("user_fname", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
            {errors.user_fname && <p className="text-xs text-rose-500 font-medium mt-1">{errors.user_fname}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Last Name *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <CustomInput
                type="text"
                placeholder="Doe"
                value={account.user_lname}
                onChange={(e) => handleChange("user_lname", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
            {errors.user_lname && <p className="text-xs text-rose-500 font-medium mt-1">{errors.user_lname}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Middle Name</span>
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Optional</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <CustomInput
                type="text"
                placeholder="Smith"
                value={account.user_mname || ""}
                onChange={(e) => handleChange("user_mname", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Suffix</span>
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Optional</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <CustomInput
                type="text"
                placeholder="Jr. / III"
                value={account.suffix_name || ""}
                onChange={(e) => handleChange("suffix_name", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Work Email Address *</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <CustomInput
              type="email"
              placeholder="work@company.com"
              value={account.user_email}
              onChange={(e) => handleChange("user_email", e.target.value)}
              className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
            />
          </div>
          {errors.user_email && <p className="text-xs text-rose-500 font-medium mt-1">{errors.user_email}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Contact Number *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <CustomInput
              type="text"
              placeholder="+639171234567"
              value={account.user_contact}
              onChange={(e) => handleChange("user_contact", e.target.value)}
              className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
            />
          </div>
          {errors.user_contact && <p className="text-xs text-rose-500 font-medium mt-1">{errors.user_contact}</p>}
        </div>
      </div>

      {/* SECTION 2: Account Security */}
      <div className="space-y-4 pt-2">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Account Credentials</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <CustomInput
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={account.password || ""}
                onChange={(e) => handleChange("password", e.target.value)}
                className="pl-10 pr-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-500 font-medium mt-1">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <CustomInput
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={account.confirmPassword || ""}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-rose-500 font-medium mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-1/3 h-11 border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-200"
          >
            Back
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 h-11 bg-primary text-white hover:bg-primary/95 font-medium rounded-lg text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          Next: Company Information
        </Button>
      </div>
    </form>
  );
}

