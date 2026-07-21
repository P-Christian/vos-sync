import * as React from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { UserProfileProvider } from "@/components/shared/providers/UserProfileProvider";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";

import { AppSidebar } from "@/app/(vos-sync)/vos-sync/_components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function getAvatarUrl(imageField: string | undefined): string {
    if (!imageField) return "";
    if (imageField.startsWith("http")) return imageField;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/assets/${imageField}`;
}

export default async function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    const payload = token ? decodeJwtPayload(token) : null;
    
    // Fetch the real freelancer profile from the DB to get the avatar image
    const profile = token ? await getFreelancerProfile(token) : null;

    const firstName = profile?.user_fname || payload?.user_fname || payload?.Firstname || payload?.firstName || "";
    const lastName = profile?.user_lname || payload?.user_lname || payload?.Lastname || payload?.lastName || "";
    const email = profile?.user_email || payload?.user_email || payload?.email || "guest@example.com";
    const name = [firstName, lastName].filter(Boolean).join(" ") || email;
    
    // Check profile_image_url (Freelancer DB style) and user_image (Admin style)
    const rawImage = profile?.profile_image_url || payload?.user_image;

    const userProfile = {
        name,
        email,
        avatar: getAvatarUrl(rawImage as string),
    };

    return (
        <UserProfileProvider user={userProfile}>
            <SidebarProvider>
            <Suspense fallback={<div className="w-64 border-r bg-sidebar" />}>
                <AppSidebar />
            </Suspense>

            {/* ✅ RIGHT column should be part of the body (NOT floating/inset card) */}
            <SidebarInset className="min-w-0 flex h-[100dvh] flex-col overflow-hidden bg-background p-0 m-0 rounded-none border-0 shadow-none">
                {children}
            </SidebarInset>
        </SidebarProvider>
        </UserProfileProvider>
    );
}
