"use client";

import React, { useState } from "react";
import { DashboardGreetingHeader } from "./DashboardGreetingHeader";
import { DashboardKpiStats } from "./DashboardKpiStats";
import { AIJobRecommendations } from "./AIJobRecommendations";
import { RecentApplicationsPreview } from "./RecentApplicationsPreview";
import { RecentMessagesPreview } from "./RecentMessagesPreview";

export function FreelancerDashboard() {
    const [topMatch, setTopMatch] = useState<{ score: number | null; title: string | null }>({
        score: null,
        title: null,
    });

    const handleJobsLoaded = React.useCallback((score: number | null, title: string | null) => {
        setTopMatch({ score, title });
    }, []);

    return (
        <div className="w-full h-full flex flex-col space-y-6">
            {/* ROW 1: Greeting Welcome Card (5 cols) + 3 KPI Stats (7 cols) */}
            <section aria-label="Overview & Key Metrics" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                <div className="lg:col-span-5">
                    <DashboardGreetingHeader />
                </div>
                <div className="lg:col-span-7">
                    <DashboardKpiStats topMatchScore={topMatch.score} topMatchTitle={topMatch.title} />
                </div>
            </section>

            {/* ROW 2: Asymmetric AI Job Spotlight (#1 Featured 7 cols + #2 & #3 Stacked 5 cols) */}
            <section aria-label="AI Job Matches">
                <AIJobRecommendations onJobsLoaded={handleJobsLoaded} />
            </section>

            {/* ROW 3: Recent Applications & Messages (Clean 2-Column Split) */}
            <section aria-label="Recent Applications & Activity" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="min-h-[360px] flex flex-col">
                    <RecentApplicationsPreview />
                </div>
                <div className="min-h-[360px] flex flex-col">
                    <RecentMessagesPreview />
                </div>
            </section>
        </div>
    );
}
