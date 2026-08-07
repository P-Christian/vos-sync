"use client";

import React from "react";
import { DashboardStats } from "./DashboardStats";
import { RecentApplicationsPreview } from "./RecentApplicationsPreview";
import { RecentMessagesPreview } from "./RecentMessagesPreview";
import { AIJobRecommendations } from "./AIJobRecommendations";
import { ProfileCompletenessBanner } from "./ProfileCompletenessBanner";

export function FreelancerDashboard() {
    return (
        <div className="w-full h-full flex flex-col space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Stats & Activity (takes up 2 columns on xl screens) */}
                <div className="xl:col-span-2 flex flex-col space-y-8">
                    {/* Stats Row */}
                    <section aria-label="Dashboard Statistics">
                        <DashboardStats />
                    </section>

                    <section aria-label="Profile Completeness">
                        <ProfileCompletenessBanner />
                    </section>

                    {/* Activity Row (Applications and Messages side-by-side on md+ screens) */}
                    <section aria-label="Recent Activity" className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className="min-h-[400px]">
                            <RecentApplicationsPreview />
                        </div>
                        <div className="min-h-[400px]">
                            <RecentMessagesPreview />
                        </div>
                    </section>
                </div>

                {/* Right Column: AI Job Recommendations (takes up 1 column on xl screens) */}
                <div className="xl:col-span-1 min-h-[400px] xl:min-h-full">
                    <section aria-label="AI Job Recommendations" className="h-full">
                        <AIJobRecommendations />
                    </section>
                </div>
            </div>
        </div>
    );
}
