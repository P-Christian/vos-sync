"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIJobRecommendations() {
    return (
        <Card className="h-full border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">AI Job Matches</CardTitle>
                </div>
                <CardDescription>
                    Personalized opportunities based on your skills and preferences.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6 h-[calc(100%-8rem)] space-y-4">
                <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mt-4 text-foreground">Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                    We are building a smart recommendation engine to bring the best jobs directly to you.
                </p>
                <Button variant="outline" className="mt-4" disabled>
                    Notify Me
                </Button>
            </CardContent>
        </Card>
    );
}
