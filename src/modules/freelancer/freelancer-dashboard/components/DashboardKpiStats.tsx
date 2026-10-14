"use client";

import React, { useEffect, useState } from "react";
import { useFreelancerApplications } from "@/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications";
import { useConversations } from "@/modules/freelancer/freelancer-messaging/hooks/useConversations";
import { Briefcase, Sparkles, MessageSquare } from "lucide-react";
import Link from "next/link";

interface DashboardKpiStatsProps {
    topMatchScore?: number | null;
    topMatchTitle?: string | null;
}

export function DashboardKpiStats({ topMatchScore, topMatchTitle }: DashboardKpiStatsProps) {
    const { summary, loading: isAppsLoading, fetchApplications } = useFreelancerApplications();
    const { conversations, loading: isMessagesLoading, loadConversations } = useConversations();

    useEffect(() => {
        fetchApplications();
        loadConversations();
    }, [fetchApplications, loadConversations]);

    const isLoading = isAppsLoading || isMessagesLoading;
    const unreadMessagesCount = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
    const activeCount = summary.pendingApplications || 0;
    const totalCount = summary.totalApplied || 0;

    // Segmented indicator logic (6 ticks)
    const filledTicks = totalCount > 0 ? Math.min(6, Math.max(1, Math.round((activeCount / Math.max(totalCount, 1)) * 6))) : (activeCount > 0 ? 3 : 0);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 h-full">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-5 shadow-sm animate-pulse flex flex-col justify-between h-[128px]"
                    >
                        <div className="flex justify-between items-center">
                            <div className="h-3 w-20 bg-slate-200 dark:bg-muted rounded"></div>
                            <div className="h-7 w-7 bg-slate-100 dark:bg-muted/80 rounded-lg"></div>
                        </div>
                        <div className="h-6 w-14 bg-slate-200 dark:bg-muted rounded my-2"></div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-muted rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 h-full">
            {/* Card 1: Active Apps */}
            <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors hover:border-slate-300 dark:hover:border-border/80">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    <span>Active Apps</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Briefcase className="w-3.5 h-3.5" />
                    </div>
                </div>
                <div className="my-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-foreground">{activeCount}</span>
                    <span className="text-xs text-slate-400 dark:text-muted-foreground"> / {totalCount} total</span>
                </div>
                <div className="flex gap-1" title={`${activeCount} active applications out of ${totalCount}`}>
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 flex-1 rounded-full ${
                                idx < filledTicks
                                    ? "bg-blue-600 dark:bg-blue-500"
                                    : "bg-slate-100 dark:bg-muted"
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Card 2: Top AI Match */}
            <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors hover:border-indigo-300 dark:hover:border-border/80">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    <span>Top AI Match</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                </div>
                <div className="my-2">
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {topMatchScore ? `${topMatchScore}%` : "95%"}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-muted-foreground"> fit score</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-muted-foreground truncate font-medium">
                    {topMatchTitle || "AI Integration Engineer"}
                </p>
            </div>

            {/* Card 3: Recent Messages */}
            <Link
                href="/vos-sync/freelancer/messaging"
                className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors hover:border-emerald-300 dark:hover:border-border/80 group"
            >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-muted-foreground font-medium">
                    <span>Recent Messages</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                </div>
                <div className="my-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-foreground">{unreadMessagesCount}</span>
                    <span className="text-xs text-slate-400 dark:text-muted-foreground"> unread in {conversations.length} chats</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {unreadMessagesCount === 0 ? "All caught up" : `${unreadMessagesCount} requires attention`}
                </p>
            </Link>
        </div>
    );
}
