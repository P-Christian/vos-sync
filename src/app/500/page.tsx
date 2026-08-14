import React from "react";
import type { Metadata } from "next";
import { ServerDownContent } from "@/components/shared/ServerDownContent";

export const metadata: Metadata = {
    title: "500 Internal Server Error | VOS Sync",
    description: "An unexpected server or database error occurred. We are working to resolve it.",
};

export default function InternalServerErrorPage() {
    return (
        <ServerDownContent
            title="500 - Internal Server Error"
            description="The server encountered an unexpected condition or database connectivity failure that prevented it from fulfilling your request."
            errorCode="500_INTERNAL_SERVER_ERROR"
        />
    );
}
