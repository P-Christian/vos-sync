// src/modules/client/registration/components/CompanyInfoStep.tsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegistrationStepProps } from "../types";
import { Building, Mail, Phone, Briefcase, Users, Globe, LayoutList } from "lucide-react";

const INDUSTRIES = [
  "Information Technology",
  "Healthcare / Medical",
  "Finance / Banking",
  "Education / Academia",
  "Manufacturing",
  "Retail / E-Commerce",
  "Construction / Real Estate",
  "Tourism / Hospitality",
  "Other",
];

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation",
  "Cooperative",
  "Government Entity",
];

export default function CompanyInfoStep({ formData, updateFields, onNext, onBack }: RegistrationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const company = formData.company || {
    company_name: "",
    company_email: "",
    company_contact: "",
    industry: "",
    business_type: "",
    company_size: "",
    company_website: "",
    company_description: "",
  };

  const handleChange = (field: string, value: string) => {
    updateFields({
      company: {
        ...company,
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
    if (!company.company_name.trim()) newErrors.company_name = "Company name is required";
    if (!company.industry) newErrors.industry = "Industry selection is required";
    
    if (company.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.company_email)) {
      newErrors.company_email = "Invalid email format";
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
      {/* Section 1: Corporate Profile */}
      <div className="space-y-4">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Corporate Details</h3>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Company Name *</label>
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Vertex Technologies Corporation"
              value={company.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
            />
          </div>
          {errors.company_name && <p className="text-xs text-rose-500 font-medium mt-1">{errors.company_name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Company Email</span>
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Recommended</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input
                type="email"
                placeholder="info@company.com"
                value={company.company_email || ""}
                onChange={(e) => handleChange("company_email", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
            {errors.company_email && <p className="text-xs text-rose-500 font-medium mt-1">{errors.company_email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Company Contact</span>
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Recommended</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="+63 2 8123 4567"
                value={company.company_contact || ""}
                onChange={(e) => handleChange("company_contact", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Classification */}
      <div className="space-y-4 pt-2">
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Classification & Web presence</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Industry *</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <Select value={company.industry} onValueChange={(val) => handleChange("industry", val)}>
                <SelectTrigger className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Select Industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.industry && <p className="text-xs text-rose-500 font-medium mt-1">{errors.industry}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Business Type</label>
            <div className="relative">
              <LayoutList className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <Select value={company.business_type} onValueChange={(val) => handleChange("business_type", val)}>
                <SelectTrigger className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Company Size</label>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <Select value={company.company_size} onValueChange={(val) => handleChange("company_size", val)}>
                <SelectTrigger className="pl-10 h-11 border-zinc-200 focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Select Size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Website / Social Link</label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="https://company.com"
                value={company.company_website || ""}
                onChange={(e) => handleChange("company_website", e.target.value)}
                className="pl-10 w-full h-11 border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Company Description</label>
          <Textarea
            placeholder="Brief description about what your company does..."
            value={company.company_description || ""}
            onChange={(e) => handleChange("company_description", e.target.value)}
            className="w-full min-h-[90px] border-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 rounded-lg p-3"
          />
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
          Next: Address Details
        </Button>
      </div>
    </form>
  );
}

