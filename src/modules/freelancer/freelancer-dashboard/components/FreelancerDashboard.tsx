"use client";

import React, { useState } from "react";
import { DashboardStats } from "./DashboardStats";
import { RecentApplicationsPreview } from "./RecentApplicationsPreview";
import { RecentMessagesPreview } from "./RecentMessagesPreview";
import { AIJobRecommendations } from "./AIJobRecommendations";
import { ProfileCompletenessBanner } from "./ProfileCompletenessBanner";

export function FreelancerDashboard() {
    const [activeSection, setActiveSection] = useState(0);

    return (
        <div className="w-full h-full flex flex-col space-y-4 md:space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-8">
                {/* Left Column: Stats & Activity (takes up 2 columns on xl screens) */}
                <div className="xl:col-span-2 flex flex-col space-y-4 md:space-y-8">
                    {/* Stats Row */}
                    <section aria-label="Dashboard Statistics">
                        <DashboardStats />
                    </section>

                    <section aria-label="Profile Completeness">
                        <ProfileCompletenessBanner />
                    </section>

                    {/* Mobile-only switcher for the three activity panels */}
                    <div className="md:hidden flex items-center gap-1 rounded-xl border bg-card p-1">
                        {["Applications", "Messages", "AI Matches"].map((label, i) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setActiveSection(i)}
                                className={`flex-1 min-h-11 rounded-lg px-2 py-1 text-[11px] leading-tight text-center font-medium transition-colors ${activeSection === i ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Activity Row (Applications and Messages side-by-side on md+ screens) */}
                    <section aria-label="Recent Activity" className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className={`min-h-[400px] max-md:min-h-0${activeSection === 0 ? "" : " max-md:hidden"}`}>
                            <RecentApplicationsPreview />
                        </div>
                        <div className={`min-h-[400px] max-md:min-h-0${activeSection === 1 ? "" : " max-md:hidden"}`}>
                            <RecentMessagesPreview />
                        </div>
                    </section>
                </div>

                {/* Right Column: AI Job Recommendations (takes up 1 column on xl screens) */}
                <div className={`xl:col-span-1 min-h-[400px] xl:min-h-full max-md:min-h-0${activeSection === 2 ? "" : " max-md:hidden"}`}>
                    <section aria-label="AI Job Recommendations" className="h-full">
                        <AIJobRecommendations />
                    </section>
                </div>
            </div>
        </div>
    );
}
