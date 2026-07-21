// src/app/(vos-sync)/vos-sync/client/dashboard/page.tsx
import * as React from "react";
import { PortalPageHeader } from "@/components/shared/layout/PortalPageHeader";
import DashboardModule from "@/modules/client/dashboard";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function pickString(obj: Record<string, unknown> | null | undefined, keys: string[]): string {
    for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function buildHeaderUserFromToken(token: string | null | undefined) {
    const payload = token ? decodeJwtPayload(token) : null;

    const first = pickString(payload, [
        "Firstname",
        "FirstName",
        "firstName",
        "firstname",
        "first_name",
    ]);
    const last = pickString(payload, [
        "LastName",
        "Lastname",
        "lastName",
        "lastname",
        "last_name",
    ]);
    const email = pickString(payload, ["email", "Email"]);

    const name = [first, last].filter(Boolean).join(" ") || email || "client Owner";

    return {
        name,
        email: email || "owner@company.com",
        avatar: "",
    };
}

export default async function clientDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
    const headerUser = buildHeaderUserFromToken(token);

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PortalPageHeader user={headerUser} />

            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-secondary/10">
                <DashboardModule userName={headerUser.name} />
            </main>
        </div>
    );}

