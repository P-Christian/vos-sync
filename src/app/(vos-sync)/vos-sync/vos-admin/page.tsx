import React from "react";
import { SchoolAdminDashboard } from "../../../../modules/vos-admin";

export const metadata = {
    title: "School Admin Portal - VOS Sync",
    description: "Dedicated portal for managing post-graduates and school tasks.",
};

export default function SchoolAdminPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1">
                <SchoolAdminDashboard />
            </main>
        </div>
    );
}
