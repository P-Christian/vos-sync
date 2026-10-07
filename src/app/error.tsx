"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[App Error Boundary Caught Exception]:", error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="mb-6 rounded-full bg-destructive/10 p-5 text-destructive">
                <AlertTriangle className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
            <p className="max-w-md text-sm text-muted-foreground mb-6">
                {error.message || "An unexpected error occurred while loading this page."}
            </p>
            <Button onClick={() => reset()} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Try again
            </Button>
        </div>
    );
}
