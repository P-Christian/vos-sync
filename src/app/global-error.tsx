"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import "../app/globals.css";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Global Error Boundary Caught Exception]:", error);
    }, [error]);

    return (
        <html lang="en">
            <body className="antialiased bg-background text-foreground flex min-h-screen items-center justify-center p-6 text-center">
                <div className="flex flex-col items-center max-w-md">
                    <div className="mb-6 rounded-full bg-destructive/10 p-5 text-destructive">
                        <AlertTriangle className="h-10 w-10" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Critical Application Error</h1>
                    <p className="text-sm text-muted-foreground mb-6">
                        {error.message || "A critical system error occurred. Please try refreshing the application."}
                    </p>
                    <Button onClick={() => reset()} className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Try again
                    </Button>
                </div>
            </body>
        </html>
    );
}
