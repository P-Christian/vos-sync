// src/modules/public/how-it-works/components/RoleSwitcherCards.tsx
"use client";

import React from "react";
import { User, Building2, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSmartRoleNavigation, TargetedRole } from "../hooks/useSmartRoleNavigation";
import { RoleMismatchModal } from "./RoleMismatchModal";

export function RoleSwitcherCards() {
  const { navigateSmart, loading, mismatchState, closeModal, confirmSignOut } = useSmartRoleNavigation();

  const roles: Array<{
    title: string;
    desc: string;
    icon: React.ReactNode;
    cta: string;
    route: string;
    targetRole: TargetedRole;
    colorClass: string;
  }> = [
    {
      title: "Employee / Job Seeker",
      desc: "Find verified job listings, build your profile, and apply with instant tracking.",
      icon: <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      cta: "Create Employee Account",
      route: "/signup?role=employee",
      targetRole: "employee",
      colorClass: "border-blue-200 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-900",
    },
    {
      title: "Employer / Company",
      desc: "Register your company, verify credentials, post vacancies, and recruit top talent.",
      icon: <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      cta: "Register Your Company",
      route: "/signup?role=employer",
      targetRole: "employer",
      colorClass: "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900",
    },
    {
      title: "School / Institution",
      desc: "Manage academic course catalogs and confirm graduate educational records.",
      icon: <GraduationCap className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      cta: "Register Your School",
      route: "/school-register",
      targetRole: "school",
      colorClass: "border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t">
      <div className="text-center space-y-2 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Still Deciding Your Account Type?
        </h3>
        <h2 className="text-2xl font-extrabold text-foreground">
          Explore the VOS Sync Ecosystem
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((r, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-3xl border ${r.colorClass} space-y-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow bg-card`}
          >
            <div className="space-y-3">
              <div className="p-3 rounded-2xl border bg-background w-fit shadow-2xs">
                {r.icon}
              </div>
              <h4 className="font-extrabold text-lg text-foreground">{r.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>

            <Button
              size="sm"
              disabled={loading}
              onClick={() => navigateSmart(r.route, r.targetRole)}
              className="font-bold text-xs gap-1.5 w-full cursor-pointer"
            >
              {r.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <RoleMismatchModal
        state={mismatchState}
        onClose={closeModal}
        onConfirmSignOut={confirmSignOut}
        loading={loading}
      />
    </div>
  );
}
