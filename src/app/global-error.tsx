"use client";

import React, { useEffect } from "react";
import { ServerDownContent } from "@/components/shared/ServerDownContent";
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
            <body className="antialiased bg-background text-foreground">
                <ServerDownContent
                    title="Critical Server Outage"
                    description="A critical system error or backend database disconnect occurred at the application root."
                    errorCode={error.digest || "500_CRITICAL_SERVER_ERROR"}
                    reset={reset}
                />
            </body>
        </html>
    );
}
