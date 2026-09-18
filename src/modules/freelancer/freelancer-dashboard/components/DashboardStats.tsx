"use client";

import React, { useEffect } from "react";
import { useFreelancerProfileContext } from "@/modules/freelancer/freelancer-profile/providers/FreelancerProfileProvider";
import { useFreelancerApplications } from "@/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications";
import { useConversations } from "@/modules/freelancer/freelancer-messaging/hooks/useConversations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, UserCheck, MessageSquare } from "lucide-react";

export function DashboardStats() {
    const { data: profile, isLoading: isProfileLoading } = useFreelancerProfileContext();
    const { summary, loading: isAppsLoading, fetchApplications } = useFreelancerApplications();
    const { conversations, loading: isMessagesLoading, loadConversations } = useConversations();

    let profileCompleteness: number | null = null;

    useEffect(() => {
        fetchApplications();
        loadConversations();
    }, [fetchApplications, loadConversations]);

    if (profile) {
        // Basic estimation of profile completeness on client
        let completed = 0;
        const total = 6;
        
        if (profile.user_fname && profile.user_lname && profile.user_bday && profile.gender) completed++;
        if (profile.resumes && profile.resumes.length > 0) completed++;
        if (profile.job_seeker_profile?.[0]?.professional_summary) completed++;
        if (profile.skills && profile.skills.length > 0) completed++;
        if (profile.work_experience && profile.work_experience.length > 0) completed++;
        if (profile.education && profile.education.length > 0) completed++;

        profileCompleteness = Math.round((completed / total) * 100);
    }

    const isLoading = isProfileLoading || isAppsLoading || isMessagesLoading;
    const unreadMessagesCount = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

    if (isLoading) {
        return (
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                <Card className="animate-pulse bg-muted/50 h-[120px] max-md:h-[92px]" />
                <Card className="animate-pulse bg-muted/50 h-[120px] max-md:h-[92px]" />
                <Card className="animate-pulse bg-muted/50 h-[120px] max-md:h-[92px]" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
            <Card className="max-md:py-2.5 max-md:gap-1.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-md:px-2.5 max-md:pb-1.5">
                    <CardTitle className="text-sm font-medium max-md:text-[11px] max-md:leading-tight">Active Applications</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground max-md:h-3.5 max-md:w-3.5" />
                </CardHeader>
                <CardContent className="max-md:px-2.5">
                    <div className="text-2xl font-bold max-md:text-lg">{summary.pendingApplications || 0}</div>
                    <p className="text-sm md:text-xs text-muted-foreground mt-1 max-md:text-[10px] max-md:leading-tight">
                        Out of {summary.totalApplied || 0} total applications
                    </p>
                </CardContent>
            </Card>
            <Card className="max-md:py-2.5 max-md:gap-1.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-md:px-2.5 max-md:pb-1.5">
                    <CardTitle className="text-sm font-medium max-md:text-[11px] max-md:leading-tight">Profile Completeness</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground max-md:h-3.5 max-md:w-3.5" />
                </CardHeader>
                <CardContent className="max-md:px-2.5">
                    <div className="text-2xl font-bold max-md:text-lg">{profileCompleteness ?? 0}%</div>
                    <p className="text-sm md:text-xs text-muted-foreground mt-1 max-md:text-[10px] max-md:leading-tight">
                        {profileCompleteness === 100 ? "Ready to apply for jobs!" : "Complete your profile to stand out"}
                    </p>
                    <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden max-md:h-1.5 max-md:mt-2">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${profileCompleteness ?? 0}%` }} 
                        />
                    </div>
                </CardContent>
            </Card>
            <Card className="max-md:py-2.5 max-md:gap-1.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-md:px-2.5 max-md:pb-1.5">
                    <CardTitle className="text-sm font-medium max-md:text-[11px] max-md:leading-tight">Recent Messages</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground max-md:h-3.5 max-md:w-3.5" />
                </CardHeader>
                <CardContent className="max-md:px-2.5">
                    <div className="text-2xl font-bold max-md:text-lg">{unreadMessagesCount} unread</div>
                    <p className="text-sm md:text-xs text-muted-foreground mt-1 max-md:text-[10px] max-md:leading-tight">
                        In {conversations.length} total conversations
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
