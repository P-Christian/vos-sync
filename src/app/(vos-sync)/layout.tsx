import * as React from "react";
import { Suspense } from "react";

import { AppSidebar } from "@/app/(vos-sync)/vos-sync/_components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <Suspense fallback={<div className="w-64 border-r bg-sidebar" />}>
                <AppSidebar />
            </Suspense>

            {/* ✅ RIGHT column should be part of the body (NOT floating/inset card) */}
            <SidebarInset className="min-w-0 flex h-[100dvh] flex-col overflow-hidden bg-background p-0 m-0 rounded-none border-0 shadow-none">
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
