// src/app/(vos-sync)/vos-sync/client/dashboard/page.tsx
import * as React from "react";
import { PortalPageHeader } from "@/components/shared/layout/PortalPageHeader";
import DashboardModule from "@/modules/client/dashboard";
import { cookies } from "next/headers";
import { getClientProfile } from "@/modules/client/settings/services/client-profile.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

export default async function clientDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const profile = token ? await getClientProfile(token) : null;

    const headerUser = {
        name: profile
            ? [profile.user_fname, profile.user_lname].filter(Boolean).join(" ")
            : "Client",
        email: profile?.user_email || "owner@company.com",
        avatar: profile?.profile_image_url
            ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/assets/${profile.profile_image_url}`
            : "",
    };

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PortalPageHeader user={headerUser} />

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-secondary/10">
                <DashboardModule userName={headerUser.name} />
            </main>
        </div>
    );
}
