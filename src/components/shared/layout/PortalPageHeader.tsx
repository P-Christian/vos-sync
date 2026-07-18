"use client";

import * as React from "react";
import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";

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
    return (
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16 overflow-hidden px-4">
            {/* Left: sidebar toggle */}
            <div className="flex h-full items-center gap-2 shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
            </div>

            {/* Right: actions + user avatar */}
            <div className="flex h-full items-center gap-2 shrink-0 overflow-hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hidden sm:flex"
                >
                    <Bell className="h-5 w-5" />
                </Button>
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
