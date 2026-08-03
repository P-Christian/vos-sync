// src/modules/public/how-it-works/HowItWorksModule.tsx
"use client";


import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const isPublicPage = pathname === "/how-it-works" || pathname === "/how-it-works/";
  const showBackButton = singleRoleMode || (!isPublicPage && (pathname?.includes("/client") || pathname?.includes("/freelancer") || pathname?.includes("/school-admin")));

  const getRoleFromQuery = (): RoleKey => {
    if (singleRoleMode) return defaultRole;
    const raw = searchParams.get("role")?.toLowerCase();
    if (raw === "employer") return "employer";
    if (raw === "school") return "school";
    if (raw === "employee") return "employee";
    return defaultRole;
  };

  const activeRole = getRoleFromQuery();

  const handleRoleChange = (newRole: RoleKey) => {
    if (singleRoleMode) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", newRole);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const currentGuide = ROLE_GUIDES[activeRole] || ROLE_GUIDES[defaultRole] || ROLE_GUIDES.employee;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Top Left Go Back button for client, employee, and school guide pages (excluding public landing page) */}
      {showBackButton && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs bg-background/90 backdrop-blur-xs hover:bg-muted text-foreground border-border px-3 py-2 rounded-lg transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
        </div>
      )}

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
