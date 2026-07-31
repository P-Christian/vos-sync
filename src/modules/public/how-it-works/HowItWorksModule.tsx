// src/modules/public/how-it-works/HowItWorksModule.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { RoleKey } from "./types";
import { ROLE_GUIDES } from "./config";
import {
  HeroSection,
  QuickOverview,
  StickyRoleTabs,
  RoadmapSection,
  FinalCTA,
  FAQSection,
  RoleSwitcherCards,
  NeedHelpSection,
} from "./components";

interface Props {
  defaultRole?: RoleKey;
  singleRoleMode?: boolean;
}

export default function HowItWorksModule({
  defaultRole = "employee",
  singleRoleMode = false,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const getRoleFromQuery = useCallback((): RoleKey => {
    if (singleRoleMode) return defaultRole;
    const raw = searchParams.get("role")?.toLowerCase();
    if (raw === "employer") return "employer";
    if (raw === "school") return "school";
    if (raw === "employee") return "employee";
    return defaultRole;
  }, [searchParams, defaultRole, singleRoleMode]);

  const [activeRole, setActiveRole] = useState<RoleKey>(getRoleFromQuery());

  useEffect(() => {
    setActiveRole(getRoleFromQuery());
  }, [getRoleFromQuery]);

  const handleRoleChange = (newRole: RoleKey) => {
    if (singleRoleMode) return;
    setActiveRole(newRole);
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", newRole);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const currentGuide = ROLE_GUIDES[activeRole] || ROLE_GUIDES[defaultRole] || ROLE_GUIDES.employee;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Quick Overview Cards (Public only) */}
      {!singleRoleMode && (
        <QuickOverview activeRole={activeRole} onSelectRole={handleRoleChange} />
      )}

      {/* 3. Sticky Role Navigation Tabs (Public only) */}
      {!singleRoleMode && (
        <StickyRoleTabs activeRole={activeRole} onSelectRole={handleRoleChange} />
      )}

      {/* 4. Six-Step Interactive Roadmap (Role Specific) */}
      <RoadmapSection guide={currentGuide} />

      {/* 5. Role-Specific Final CTA Banner */}
      <FinalCTA guide={currentGuide} />

      {/* 6. Frequently Asked Questions */}
      <FAQSection activeRole={activeRole} />

      {/* 7. Global Role Switcher Cards (Public only) */}
      {!singleRoleMode && <RoleSwitcherCards />}

      {/* 8. Need Help Support Callout */}
      <NeedHelpSection />
    </div>
  );
}
