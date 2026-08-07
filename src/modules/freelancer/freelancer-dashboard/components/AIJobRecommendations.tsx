"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface RecommendedJob {
    job_id: number;
    job_title: string;
    company_name: string;
    job_type: string;
    work_arrangement: string;
    salary_min?: number;
    salary_max?: number;
    job_location: string;
    reasoning: string;
}

export function AIJobRecommendations() {
    const [jobs, setJobs] = useState<RecommendedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchRecommendations = async () => {
            try {
                const res = await fetch("/api/freelancer/ai-recommendations");
                if (!res.ok) throw new Error("Failed to fetch recommendations");
                const data = await res.json();
                if (isMounted) {
                    setJobs(data.recommendations || []);
                    setLoading(false);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    console.error("AI Error:", err);
                    setError("Failed to generate recommendations. Please try again later.");
                    setLoading(false);
                }
            }
        };

        fetchRecommendations();
        
        return () => { isMounted = false; };
    }, []);

    return (
        <Card className="h-full border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            
            <CardHeader className="shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg shadow-sm">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">AI Job Matches</CardTitle>
                </div>
                <CardDescription>
                    Personalized opportunities based on your skills and preferences.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto pr-4 pb-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-6 h-full space-y-4">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                            <Sparkles className="h-8 w-8 text-primary/70 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-semibold mt-4 text-foreground animate-pulse">Analyzing your profile...</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px]">
                            Matching your skills and preferences with active jobs.
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <p className="text-sm text-red-500 mb-4">{error}</p>
                        <Button variant="outline" onClick={() => window.location.reload()} size="sm">Retry</Button>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-sm text-muted-foreground">No matches found at the moment. Update your profile to get better recommendations.</p>
                        <Button variant="outline" asChild className="mt-4" size="sm">
                            <Link href="/vos-sync/freelancer/profile">Update Profile</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <Card key={job.job_id} className="bg-card shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary/60 hover:border-l-primary cursor-pointer group">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                                                <Link href={`/vos-sync/freelancer/jobs/${job.job_id}`} className="after:absolute after:inset-0 relative">
                                                    {job.job_title}
                                                </Link>
                                            </h4>
                                            <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                                                <span className="flex items-center truncate">
                                                    <Building className="h-3 w-3 mr-1 shrink-0" />
                                                    <span className="truncate">{job.company_name}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">{job.work_arrangement}</Badge>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">{job.job_type.replace("_", " ")}</Badge>
                                        {(job.salary_min || job.salary_max) && (
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-400">
                                                PHP {job.salary_min ? Number(job.salary_min).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} {job.salary_max ? `- ${Number(job.salary_max).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '+'}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div className="bg-primary/5 p-3 rounded-md border border-primary/10 mt-3 relative z-10">
                                        <div className="flex items-start gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                            <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed">
                                                <span className="font-medium text-primary/90 mr-1">Why it&apos;s a fit:</span>
                                                {job.reasoning}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
