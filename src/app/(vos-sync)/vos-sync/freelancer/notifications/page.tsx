// src/app/(vos-sync)/vos-sync/freelancer/notifications/page.tsx

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cookies } from "next/headers";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";
import { NotificationBell } from "@/modules/freelancer/freelancer-notifications/components/NotificationBellWrapper";
import { UserSearchBar } from "@/modules/shared/search/components/UserSearchBar";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";
import FreelancerNotificationsModule from "@/modules/freelancer/freelancer-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications | VOS Sync Freelancer Portal",
  description:
    "Stay updated on job applications, interview schedules, and company activity on VOS Sync.",
};

export default async function FreelancerNotificationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;
  const profile = token ? await getFreelancerProfile(token) : null;

  const user = {
    name: profile ? `${profile.user_fname} ${profile.user_lname}` : "Guest",
    email: profile?.user_email || "guest@example.com",
    avatar: profile?.profile_image_url
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/assets/${profile.profile_image_url}`
      : "",
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16">
        <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:px-4 overflow-hidden">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="hidden sm:block mr-2 data-[orientation=vertical]:h-4 shrink-0"
          />
          <div className="min-w-0 overflow-hidden">
            <Breadcrumb>
              <BreadcrumbList className="min-w-0 overflow-hidden">
                <BreadcrumbItem className="hidden md:block shrink-0">
                  <BreadcrumbLink href="#">Freelancer</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block shrink-0" />
                <BreadcrumbItem className="min-w-0 overflow-hidden">
                  <BreadcrumbPage className="truncate max-w-[56vw] sm:max-w-[60vw] md:max-w-none">
                    Notifications
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <div className="flex h-full items-center px-2 sm:px-4 shrink-0 max-w-[48vw] sm:max-w-none gap-2">
          <div className="hidden md:block mr-2">
            <UserSearchBar />
          </div>
          <NotificationBell />
          <NavUser user={user} />
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-secondary/10">
        <FreelancerNotificationsModule />
      </main>
    </div>
  );
}
