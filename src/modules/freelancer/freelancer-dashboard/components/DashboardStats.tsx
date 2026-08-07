"use client";

import React, { useEffect, useState } from "react";
import { useFreelancerProfileContext } from "@/modules/freelancer/freelancer-profile/providers/FreelancerProfileProvider";
import { useFreelancerApplications } from "@/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications";
import { useConversations } from "@/modules/freelancer/freelancer-messaging/hooks/useConversations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, UserCheck, MessageSquare } from "lucide-react";

export function DashboardStats() {
    const { data: profile, isLoading: isProfileLoading } = useFreelancerProfileContext();
    const { summary, loading: isAppsLoading, fetchApplications } = useFreelancerApplications();
    const { conversations, loading: isMessagesLoading, loadConversations } = useConversations();

    const [profileCompleteness, setProfileCompleteness] = useState<number | null>(null);

    useEffect(() => {
        fetchApplications();
        loadConversations();
    }, [fetchApplications, loadConversations]);

    useEffect(() => {
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

            const percentage = Math.round((completed / total) * 100);
            setProfileCompleteness(percentage);
        }
    }, [profile]);

    const isLoading = isProfileLoading || isAppsLoading || isMessagesLoading;
    const unreadMessagesCount = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="animate-pulse bg-muted/50 h-[120px]" />
                <Card className="animate-pulse bg-muted/50 h-[120px]" />
                <Card className="animate-pulse bg-muted/50 h-[120px]" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.pendingApplications || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Out of {summary.totalApplied || 0} total applications
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profile Completeness</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{profileCompleteness ?? 0}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {profileCompleteness === 100 ? "Ready to apply for jobs!" : "Complete your profile to stand out"}
                    </p>
                    <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${profileCompleteness ?? 0}%` }} 
                        />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Messages</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{unreadMessagesCount} unread</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        In {conversations.length} total conversations
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
