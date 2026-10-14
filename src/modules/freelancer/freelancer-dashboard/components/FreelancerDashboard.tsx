"use client";

import React from "react";
import { DashboardGreetingHeader } from "./DashboardGreetingHeader";
import { DashboardKpiStats } from "./DashboardKpiStats";
import { AIJobRecommendations } from "./AIJobRecommendations";
import { RecentApplicationsPreview } from "./RecentApplicationsPreview";
import { RecentMessagesPreview } from "./RecentMessagesPreview";
import { useFreelancerDashboardData } from "../hooks/useFreelancerDashboardData";

export function FreelancerDashboard() {
    const { applications, summary, conversations, recommendations, coreLoading, aiLoading } = useFreelancerDashboardData();

    const topMatch = React.useMemo(() => {
        if (recommendations && recommendations.length > 0) {
            return {
                score: recommendations[0].match_percentage || 95,
                title: recommendations[0].job_title || null,
            };
        }
        return { score: null, title: null };
    }, [recommendations]);

    return (
        <div className="w-full h-full flex flex-col space-y-6">
            {/* ROW 1: Greeting Welcome Card (5 cols) + 3 KPI Stats (7 cols) */}
            <section aria-label="Overview & Key Metrics" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                <div className="lg:col-span-5">
                    <DashboardGreetingHeader />
                </div>
                <div className="lg:col-span-7">
                    <DashboardKpiStats
                        topMatchScore={topMatch.score}
                        topMatchTitle={topMatch.title}
                        summary={summary}
                        conversations={conversations}
                        loading={coreLoading}
                    />
                </div>
            </section>

            {/* ROW 2: Asymmetric AI Job Spotlight (#1 Featured 7 cols + #2 & #3 Stacked 5 cols) */}
            <section aria-label="AI Job Matches">
                <AIJobRecommendations
                    jobs={recommendations}
                    loading={aiLoading}
                />
            </section>

            {/* ROW 3: Recent Applications & Messages (Clean 2-Column Split) */}
            <section aria-label="Recent Applications & Activity" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="min-h-[360px] flex flex-col">
                    <RecentApplicationsPreview
                        applications={applications}
                        loading={coreLoading}
                    />
                </div>
                <div className="min-h-[360px] flex flex-col">
                    <RecentMessagesPreview
                        conversations={conversations}
                        loading={coreLoading}
                    />
                </div>
            </section>
        </div>
    );
}
