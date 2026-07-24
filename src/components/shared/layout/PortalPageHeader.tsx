"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";
import { NotificationBell as FreelancerNotificationBell } from "@/modules/freelancer/freelancer-notifications/components/NotificationBellWrapper";
import { ClientNotificationBell } from "@/modules/client/notifications/components/ClientNotificationBellWrapper";
import { UserSearchBar } from "@/modules/shared/search/components/UserSearchBar";

type PortalPageHeaderUser = {
    name: string;
    email: string;
    avatar?: string;
};

interface PortalPageHeaderProps {
    user: PortalPageHeaderUser;
}

/**
 * Reusable page header for all portal pages.
 * Includes a SidebarTrigger (hamburger) on the left for mobile support,
 * and Bell, HelpCircle, and NavUser on the right.
 */
export function PortalPageHeader({ user }: PortalPageHeaderProps) {
    const pathname = usePathname();
    const isClientRoute = pathname?.startsWith("/vos-sync/client");
    const isFreelancerRoute = pathname?.startsWith("/vos-sync/freelancer");

    return (
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16 px-4">
            {/* Left: sidebar toggle + searchbar */}
            <div className="flex h-full items-center gap-4 shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <div className="hidden md:block w-2xl">
                    <UserSearchBar />
                </div>
            </div>

            {/* Right: actions + user avatar */}
            <div className="flex h-full items-center gap-2 shrink-0">
                {isClientRoute && <ClientNotificationBell />}
                {isFreelancerRoute && <FreelancerNotificationBell />}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hidden sm:flex"
                >
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <div className="border-l h-6 mx-2 hidden sm:block" />
                <div className="w-auto max-w-[240px]">
                    <NavUser user={user} />
                </div>
            </div>
        </header>
    );
}

