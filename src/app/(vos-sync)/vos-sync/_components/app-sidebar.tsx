"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Users,
    Bot,
    ClipboardList,
    ShoppingCart,
    Bell,
    Settings2,
    MessageSquare,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const data = {
    navMain: [
        {
            title: "Attendance Report",
            url: "/employee-relations/attendance-report",
            icon: Users,
        },
        {
            title: "Application",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Overtime",
                    url: "/employee-relations/application/overtime",
                    icon: ClipboardList,
                },
                {
                    title: "Undertime",
                    url: "/employee-relations/application/undertime",
                    icon: ClipboardList,
                },
                {
                    title: "Leave",
                    url: "/employee-relations/application/leave",
                    icon: ShoppingCart,
                },
            ],
        },
        { title: "Memo", url: "/employee-relations/memo", icon: Users },
        { title: "Announcement", url: "/employee-relations/announcement", icon: Users },
    ],
};

import { usePathname, useSearchParams } from "next/navigation";
import { DashboardSidebar, type SidebarConfig } from "@/components/shared/layout/DashboardSidebar";
import { LayoutDashboard, Briefcase, FileText, User, CalendarDays, GraduationCap, ClipboardCheck, LogOut, Share2 } from "lucide-react";

export function AppSidebar({
    className,
    ...props
}: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const portal = searchParams.get("portal");

    if (pathname.startsWith("/vos-sync/freelancer") || portal === "freelancer") {
        const FREELANCER_SIDEBAR_CONFIG: SidebarConfig = {
            title: "VOS Sync",
            subtitle: "FREELANCER PORTAL",
            homeUrl: "/vos-sync/freelancer/dashboard",
            navItems: [
                { label: "Dashboard", href: "/vos-sync/freelancer/dashboard", icon: LayoutDashboard },
                { label: "My Profile", href: "/vos-sync/freelancer/profile", icon: User },
                { label: "Find Work", href: "/vos-sync/freelancer/jobs", icon: Briefcase },
                { label: "My Applications", href: "/vos-sync/freelancer/applications", icon: FileText },
                { label: "Messages", href: "/vos-sync/freelancer/messaging", icon: MessageSquare },
                { label: "Referrals", href: "/vos-sync/freelancer/referrals", icon: Share2 },
                { label: "Settings", href: "/vos-sync/freelancer/settings", icon: Settings2 },
            ],
            footerLinks: [
                { label: "Log out", href: "/logout", icon: LogOut },
            ],
        };
        return <DashboardSidebar config={FREELANCER_SIDEBAR_CONFIG} {...props} />;
    }

    if (pathname.startsWith("/vos-sync/client") || portal === "client") {
        const CLIENT_SIDEBAR_CONFIG: SidebarConfig = {
            title: "VOS Sync",
            subtitle: "CLIENT PORTAL",
            homeUrl: "/vos-sync/client/dashboard",
            navItems: [
                { label: "Dashboard", href: "/vos-sync/client/dashboard", icon: LayoutDashboard },
                { label: "Company Profile", href: "/vos-sync/client/company-profile", icon: User },
                { label: "Manage Jobs", href: "/vos-sync/client/jobs", icon: Briefcase },
                { label: "Review Candidates", href: "/vos-sync/client/applicants", icon: FileText },
                { label: "Interview Schedule", href: "/vos-sync/client/interviews", icon: CalendarDays },
                { label: "Messages", href: "/vos-sync/client/messaging", icon: MessageSquare },
                { label: "Notifications", href: "/vos-sync/client/notifications", icon: Bell },
                { label: "Settings", href: "/vos-sync/client/settings", icon: Settings2 },



            ],
            footerLinks: [],
        };
        return <DashboardSidebar config={CLIENT_SIDEBAR_CONFIG} {...props} />;
    }

    if (pathname.startsWith("/vos-sync/school-admin") || portal === "school-admin") {
        const SCHOOL_DASHBOARD_SIDEBAR_CONFIG: SidebarConfig = {
            title: "VOS Sync",
            subtitle: "SCHOOL ADMIN",
            homeUrl: "/vos-sync/school-admin",
            navItems: [
                { label: "Dashboard", href: "/vos-sync/school-admin", icon: LayoutDashboard },
                { label: "My Courses", href: "/vos-sync/school-admin/courses", icon: GraduationCap },
                { label: "Settings", href: "/vos-sync/school-admin/settings", icon: Settings2 },
            ],
            footerLinks: [
                { label: "Log out", href: "/logout", icon: LogOut },
            ],
        };
        return <DashboardSidebar config={SCHOOL_DASHBOARD_SIDEBAR_CONFIG} {...props} />;
    }

    if (pathname.startsWith("/vos-sync/vos-admin") || portal === "vos-admin") {
        const SCHOOL_ADMIN_SIDEBAR_CONFIG: SidebarConfig = {
            title: "VOS Sync",
            subtitle: "VOS Sync ADMIN",
            homeUrl: "/vos-sync/vos-admin",
            navItems: [
                { label: "Dashboard", href: "/vos-sync/vos-admin", icon: LayoutDashboard },
                { label: "School List", href: "/vos-sync/vos-admin/schools", icon: GraduationCap },
                { label: "Request Management", href: "/vos-sync/vos-admin/requests", icon: ClipboardCheck },
                { label: "User Management", href: "/vos-sync/vos-admin/users", icon: Users },
                { label: "Settings", href: "/vos-sync/vos-admin/settings", icon: Settings2 },
            ],
            footerLinks: [
                { label: "Log out", href: "/logout", icon: LogOut },
            ],
        };
        return <DashboardSidebar config={SCHOOL_ADMIN_SIDEBAR_CONFIG} {...props} />;
    }
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
                            <Link href="/main-dashboard">
                                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden">
                                    <Image
                                        src="/vertex_logo_black.png"
                                        alt="VOS Logo"
                                        width={40}
                                        height={40}
                                        className="h-9 w-10 object-contain"
                                        priority
                                    />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">VOS Web</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Customer Relationship Management
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator />

            <SidebarContent>
                <div className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                    Platform
                </div>

                <ScrollArea
                    className={cn(
                        "min-h-0 flex-1",
                        "[&_[data-radix-scroll-area-viewport]>div]:block",
                        "[&_[data-radix-scroll-area-viewport]>div]:w-full",
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0"
                    )}
                >
                    <div className="w-full min-w-0">
                        <NavMain items={data.navMain} />
                    </div>
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter className="p-0">
                <Separator />
                <div className="py-3 text-center text-xs text-muted-foreground">
                    VOS Web v2.0
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}