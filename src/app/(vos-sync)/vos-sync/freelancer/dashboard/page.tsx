import * as React from "react";
import { cookies } from "next/headers";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";
import { FreelancerPageHeader } from "@/components/shared/layout/FreelancerPageHeader";
import { FreelancerDashboard } from "@/modules/freelancer/freelancer-dashboard/components/FreelancerDashboard";

function checkIsNewUser(dateStr?: string | null): boolean {
    if (!dateStr) return true;
    const accepted = new Date(dateStr).getTime();
    if (isNaN(accepted)) return true;
    const diffDays = (Date.now() - accepted) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 10;
}

export default async function FreelancerDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    const profile = token ? await getFreelancerProfile(token) : null;

    const termsAcceptedAt = (profile as Record<string, unknown> | null)?.terms_accepted_at as string | undefined;
    const showNewBadge = checkIsNewUser(termsAcceptedAt);

    const user = {
        name: profile ? `${profile.user_fname} ${profile.user_lname}` : "Guest",
        email: profile?.user_email || "guest@example.com",
        avatar: profile?.profile_image_url ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/assets/${profile.profile_image_url}` : "",
    };

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <FreelancerPageHeader label="Dashboard" user={user} showNewBadge={showNewBadge} />

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
                <div className="w-full mt-4 md:mt-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome back, {profile?.user_fname || 'Guest'}</h1>
                    <p className="text-muted-foreground mt-2">Here is a summary of your activity on Vos Sync.</p>
                    
                    <div className="mt-4 md:mt-8">
                        <FreelancerDashboard />
                    </div>
                </div>
            </main>
        </div>
    );
}
