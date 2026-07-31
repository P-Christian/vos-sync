// src/components/shared/layout/PortalPageHeader.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";
import { NotificationBell as FreelancerNotificationBell } from "@/modules/freelancer/freelancer-notifications/components/NotificationBellWrapper";
import { ClientNotificationBell } from "@/modules/client/notifications/components/ClientNotificationBellWrapper";
import { SchoolAdminNotificationBell } from "@/modules/school-admin/components/SchoolAdminNotificationBellWrapper";
import { UserSearchBar } from "@/modules/shared/search/components/UserSearchBar";

type PortalPageHeaderUser = {
  name: string;
  email: string;
  avatar?: string;
  terms_accepted_at?: string | null;
  created_at?: string | null;
};

interface PortalPageHeaderProps {
  user: PortalPageHeaderUser;
}

function isWithin10Days(dateStr?: string | null): boolean {
  if (!dateStr) return true; // Default to true if unauthenticated/demo
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;
  const diffMs = Date.now() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 10;
}

/**
 * Reusable page header for all portal pages.
 * Includes a SidebarTrigger (hamburger) on the left for mobile support,
 * and Bell, HelpCircle (links to role How It Works guide), and NavUser on the right.
 */
export function PortalPageHeader({ user }: PortalPageHeaderProps) {
  const pathname = usePathname();
  const isClientRoute = pathname?.startsWith("/vos-sync/client");
  const isFreelancerRoute = pathname?.startsWith("/vos-sync/freelancer");
  const isSchoolAdminRoute = pathname?.startsWith("/vos-sync/school-admin");
  const isVosAdminRoute = pathname?.startsWith("/vos-sync/vos-admin");

  const getHelpRoute = () => {
    if (isClientRoute) return "/vos-sync/client/how-it-works";
    if (isFreelancerRoute) return "/vos-sync/freelancer/how-it-works";
    if (isSchoolAdminRoute) return "/vos-sync/school-admin/how-it-works";
    return "/how-it-works";
  };

  const showNewBadge = isWithin10Days(user.terms_accepted_at || user.created_at);

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b shadow-xs bg-background sm:h-16 px-4">
      {/* Left: sidebar toggle + searchbar */}
      <div className="flex h-full items-center gap-4 shrink-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        {!isVosAdminRoute && (
          <div className="hidden md:block w-2xl">
            <UserSearchBar />
          </div>
        )}
      </div>

      {/* Right: actions + user avatar */}
      <div className="flex h-full items-center gap-2 shrink-0">
        {isClientRoute && <ClientNotificationBell />}
        {isFreelancerRoute && <FreelancerNotificationBell />}
        {isSchoolAdminRoute && <SchoolAdminNotificationBell />}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground flex relative cursor-pointer"
              >
                <Link href={getHelpRoute()}>
                  <HelpCircle className="h-5 w-5" />
                  {showNewBadge && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-semibold text-xs">
              <span>Need Help?</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="border-l h-6 mx-2 hidden sm:block" />
        <div className="w-auto max-w-[240px]">
          <NavUser user={user} />
        </div>
      </div>
    </header>
  );
}
