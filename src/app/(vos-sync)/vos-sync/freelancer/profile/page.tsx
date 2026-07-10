import * as React from "react";
import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";
import { cookies } from "next/headers";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";
import { FreelancerProfilePage } from "@/modules/freelancer/freelancer-profile/FreelancerProfilePage";

export default async function FreelancerProfileRoute() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    const profile = token ? await getFreelancerProfile(token) : null;

    const user = {
        name: profile ? `${profile.user_fname} ${profile.user_lname}` : "Guest",
        email: profile?.user_email || "guest@example.com",
        avatar: "",
    };

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-end border-b shadow-sm bg-background sm:h-16 overflow-hidden px-4 gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    <Bell className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <div className="border-l h-6 mx-2 hidden sm:block" />
                <div className="w-auto max-w-[240px]">
                    <NavUser user={user} />
                </div>
            </header>

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-secondary/10">
                <div className="w-full mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Freelancer Profile</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Manage your identity and professional assets on Vos Sync.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="font-medium bg-background text-sm">View Public Profile</Button>
                        <Button className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white font-medium text-sm">Save Changes</Button>
                    </div>
                </div>
                
                <FreelancerProfilePage />
            </main>
        </div>
    );
}
