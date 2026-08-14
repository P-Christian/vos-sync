"use client";

import React, { useEffect } from "react";
import { ServerDownContent } from "@/components/shared/ServerDownContent";

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

    const isDatabaseError =
        error.message?.toLowerCase().includes("database") ||
        error.message?.toLowerCase().includes("fetch") ||
        error.message?.toLowerCase().includes("econnrefused") ||
        error.message?.toLowerCase().includes("503");

    return (
        <ServerDownContent
            title={isDatabaseError ? "Database Connection Error" : "Unexpected Server Error"}
            description={
                error.message ||
                "A system or database error occurred while processing your request. Please try reconnecting."
            }
            errorCode={error.digest || "500_SERVER_ERROR"}
            reset={reset}
        />
    );
}
