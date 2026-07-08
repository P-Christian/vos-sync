import * as React from "react";
import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";
import { getMockFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";
import FreelancerApplicationsPage from "@/modules/freelancer/freelancer-applications/FreelancerApplicationsPage";

export default function FreelancerApplicationsRoute() {
    const profile = getMockFreelancerProfile();
    const user = {
        name: profile.fullName,
        email: profile.email,
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

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-secondary/10">
                <FreelancerApplicationsPage />
            </main>
        </div>
    );
}
