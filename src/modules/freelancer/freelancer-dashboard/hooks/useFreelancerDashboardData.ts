"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApplicationItem, ApplicationSummary } from "@/modules/freelancer/freelancer-applications/types";
import type { Conversation } from "@/modules/freelancer/freelancer-messaging/types";
import { fetchConversations } from "@/modules/freelancer/freelancer-messaging/providers/MessagingProvider";
import { useRealtime } from "@/modules/shared/providers/RealtimeProvider";
import type { RecommendedJob } from "../components/AIJobRecommendations";

interface DashboardDataState {
    applications: ApplicationItem[];
    summary: ApplicationSummary;
    conversations: Conversation[];
    recommendations: RecommendedJob[];
    coreLoading: boolean;
    aiLoading: boolean;
    error: string | null;
}

const DEFAULT_SUMMARY: ApplicationSummary = {
    totalApplied: 0,
    pendingApplications: 0,
    activeOffers: 0,
    successRate: 0,
};

export function useFreelancerDashboardData() {
    const [state, setState] = useState<DashboardDataState>({
        applications: [],
        summary: DEFAULT_SUMMARY,
        conversations: [],
        recommendations: [],
        coreLoading: true,
        aiLoading: true,
        error: null,
    });

    const { subscribe } = useRealtime();

    const fetchAllDashboardData = useCallback(() => {
        // TIER 1: Core Dashboard Data (Applications + Messages) -> Instant (~150-250ms)
        Promise.allSettled([
            fetch("/api/freelancer/applications").then(async (res) => {
                if (!res.ok) throw new Error("Failed to load applications");
                return res.json();
            }),
            fetchConversations(),
        ]).then(([appsResult, convsResult]) => {
            let loadedApps: ApplicationItem[] = [];
            let loadedSummary: ApplicationSummary = DEFAULT_SUMMARY;

            if (appsResult.status === "fulfilled" && appsResult.value) {
                loadedApps = appsResult.value.applications || [];
                const total = loadedApps.length;
                const terminalOrDraftStatuses = ["DRAFT", "HIRED", "REJECTED", "WITHDRAWN", "CANCELLED_CLOSED"];
                const pendingApplications = loadedApps.filter(
                    (a) => !terminalOrDraftStatuses.includes(a.application_status)
                ).length;
                const hired = loadedApps.filter((a) => a.application_status === "HIRED").length;
                const successRate = total > 0 ? Math.round((hired / total) * 100) : 0;

                loadedSummary = {
                    totalApplied: total,
                    pendingApplications,
                    activeOffers: hired,
                    successRate,
                };
            }

            let loadedConvs: Conversation[] = [];
            if (convsResult.status === "fulfilled" && Array.isArray(convsResult.value)) {
                loadedConvs = convsResult.value;
            }

            setState((prev) => ({
                ...prev,
                applications: loadedApps,
                summary: loadedSummary,
                conversations: loadedConvs,
                coreLoading: false,
            }));
        }).catch((err) => {
            console.error("Dashboard core data sync error:", err);
            setState((prev) => ({ ...prev, coreLoading: false }));
        });

        // TIER 2: AI Recommendations -> Streams in background without blocking core dashboard
        fetch("/api/freelancer/ai-recommendations")
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to load AI recommendations");
                return res.json();
            })
            .then((aiData) => {
                const list: RecommendedJob[] = aiData.recommendations || [];
                setState((prev) => ({
                    ...prev,
                    recommendations: list,
                    aiLoading: false,
                }));
            })
            .catch((err) => {
                console.error("AI recommendations error:", err);
                setState((prev) => ({
                    ...prev,
                    aiLoading: false,
                }));
            });
    }, []);

    useEffect(() => {
        fetchAllDashboardData();
    }, [fetchAllDashboardData]);

    // Realtime update on incoming messages
    useEffect(() => {
        const unsubscribe = subscribe("vs_messages", () => {
            fetchConversations()
                .then((data) => {
                    if (data) {
                        setState((prev) => ({ ...prev, conversations: data }));
                    }
                })
                .catch(() => {});
        });
        return () => unsubscribe();
    }, [subscribe]);

    return {
        ...state,
        refetch: fetchAllDashboardData,
    };
}
