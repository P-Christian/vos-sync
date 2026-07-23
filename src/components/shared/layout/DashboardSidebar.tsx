"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

export type SidebarConfig = {
    title: string;
    subtitle: string;
    homeUrl?: string;
    navItems: NavItem[];
    ctaButton?: {
        label: string;
        href: string;
    };
    footerLinks: NavItem[];
};

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
    config: SidebarConfig;
}

function isRouteActiveExact(currentPath: string, targetUrl: string) {
    if (!targetUrl || targetUrl === "#") return false;
    const cur = currentPath.endsWith("/") && currentPath !== "/" ? currentPath.slice(0, -1) : currentPath;
    const tgt = targetUrl.endsWith("/") && targetUrl !== "/" ? targetUrl.slice(0, -1) : targetUrl;
    return cur === tgt;
}

export function DashboardSidebar({
    config,
    className,
    ...props
}: DashboardSidebarProps) {
    const pathname = usePathname();

    const handleFooterClick = async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href === "/logout") {
            e.preventDefault();
            try {
                await fetch("/api/auth/logout", { method: "POST" });
            } finally {
                document.body.style.display = 'none';
                window.location.href = "/login";
            }
        }
    };

    return (
        <Sidebar
            {...props}
            className={cn(
                "border-r border-sidebar-border/60 dark:border-white/20",
                "shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_16px_40px_-24px_rgba(0,0,0,0.9)]",
                className
            )}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={config.homeUrl || "/main-dashboard"}>
                                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden">
                                    <Image
                                        src="/vertex_logo_black.png"
                                        alt="VOS Logo"
                                        width={40}
                                        height={40}
                                        className="h-9 w-10 object-contain dark:invert"
                                        priority
                                    />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-bold text-base text-primary">{config.title}</span>
                                    <span className="truncate text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mt-0.5">
                                        {config.subtitle}
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator />

            <SidebarContent>
                <ScrollArea
                    className={cn(
                        "min-h-0 flex-1 py-4",
                        "[&_[data-radix-scroll-area-viewport]>div]:block",
                        "[&_[data-radix-scroll-area-viewport]>div]:w-full",
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0"
                    )}
                >
                    <SidebarMenu className="px-2 space-y-1">
                        {config.navItems.map((item, index) => {
                            const isActive = isRouteActiveExact(pathname, item.href);
                            return (
                                <SidebarMenuItem key={index}>
                                    <SidebarMenuButton 
                                        asChild 
                                        isActive={isActive}
                                        className={cn(
                                            "h-10 text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                            isActive && "bg-sidebar-primary/10 text-sidebar-primary font-medium hover:bg-sidebar-primary/15 hover:text-sidebar-primary"
                                        )}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="size-5 shrink-0" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </ScrollArea>
                
                {config.ctaButton && (
                    <div className="px-4 py-4">
                        <Button asChild className="w-full justify-start font-medium bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white" size="lg">
                            <Link href={config.ctaButton.href}>
                                {config.ctaButton.label}
                            </Link>
                        </Button>
                    </div>
                )}
            </SidebarContent>

            <SidebarFooter className="p-0">
                <Separator />
                <SidebarMenu className="p-2 space-y-1">
                    {config.footerLinks.map((item, index) => (
                        <SidebarMenuItem key={index}>
                            <SidebarMenuButton asChild className="text-muted-foreground hover:text-foreground">
                                <Link href={item.href} onClick={(e) => handleFooterClick(e, item.href)}>
                                    <item.icon className="size-4 shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
