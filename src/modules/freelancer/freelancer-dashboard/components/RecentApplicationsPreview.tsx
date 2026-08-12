"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useFreelancerApplications } from "@/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight, Clock, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function RecentApplicationsPreview() {
    const { applications, loading, fetchApplications } = useFreelancerApplications();

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    // Only show top 3 recent applications
    const recentApps = applications.slice(0, 3);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
            case "IN_REVIEW":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500";
            case "HIRED":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500";
            case "REJECTED":
                return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500";
            default:
                return "bg-secondary text-secondary-foreground";
        }
    };

    if (loading) {
        return (
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col space-y-2 p-3 border rounded-lg animate-pulse bg-muted/20">
                            <div className="h-4 bg-muted rounded w-2/3"></div>
                            <div className="h-3 bg-muted rounded w-1/3"></div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                    <CardDescription>Track your job application status</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                    <Link href="/vos-sync/freelancer/applications">
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {recentApps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                        <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <h3 className="font-medium text-foreground">No applications yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                            Start applying to jobs to see your progress here.
                        </p>
                        <Button variant="outline" size="sm" asChild className="mt-4">
                            <Link href="/vos-sync/freelancer/jobs">Browse Jobs</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentApps.map((app) => (
                            <div key={app.application_id} className="group relative flex flex-col p-4 border rounded-xl hover:border-primary/50 transition-colors bg-card">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-sm truncate text-foreground">
                                            {app.job_title}
                                        </h4>
                                        <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                                            <span className="flex items-center truncate">
                                                <Building className="h-3 w-3 mr-1 shrink-0" />
                                                <span className="truncate">{app.company_name || 'Confidential'}</span>
                                            </span>
                                            <span>&bull;</span>
                                            <span className="flex items-center whitespace-nowrap">
                                                <Clock className="h-3 w-3 mr-1 shrink-0" />
                                                {app.applied_at && !isNaN(new Date(app.applied_at).getTime())
                                                    ? formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })
                                                    : "Recently"}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className={`shrink-0 ${getStatusColor(app.application_status)} border-none`}>
                                        {app.application_status.replace("_", " ")}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {recentApps.length > 0 && (
                    <Button variant="ghost" size="sm" asChild className="w-full mt-4 sm:hidden">
                        <Link href="/vos-sync/freelancer/applications">
                            View All Applications
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
