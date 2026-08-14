"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { 
    ServerOff, 
    DatabaseZap, 
    RefreshCw, 
    WifiOff, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowLeft,
    ShieldAlert,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemStatus {
    server: boolean;
    database: boolean;
    checking: boolean;
    lastChecked: string | null;
    latencyMs: number | null;
    errorType: "database" | "server" | "network" | "unknown";
}

interface ServerDownContentProps {
    title?: string;
    description?: string;
    errorCode?: string;
    reset?: () => void;
}

export const ServerDownContent = memo(function ServerDownContent({
    title = "System Temporarily Unavailable",
    description = "We are currently experiencing a disruption with our database or backend servers. Our team has been notified and is working to restore services.",
    errorCode = "503_SERVICE_UNAVAILABLE",
    reset,
}: ServerDownContentProps) {
    const [status, setStatus] = useState<SystemStatus>({
        server: true,
        database: false,
        checking: false,
        lastChecked: null,
        latencyMs: null,
        errorType: "database",
    });

    const checkSystemHealth = useCallback(async () => {
        setStatus((prev) => ({ ...prev, checking: true }));
        const startTime = Date.now();

        try {
            const res = await fetch("/api/health", { cache: "no-store" });
            const latency = Date.now() - startTime;
            const data = await res.json().catch(() => null);

            // Format PH Local Time (UTC+8)
            const phTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19) + " PST";

            if (res.ok && data?.database) {
                setStatus({
                    server: true,
                    database: true,
                    checking: false,
                    lastChecked: phTime,
                    latencyMs: latency,
                    errorType: "unknown",
                });
                if (reset) {
                    reset();
                } else if (typeof window !== "undefined") {
                    window.location.reload();
                }
            } else {
                setStatus({
                    server: data?.server ?? true,
                    database: data?.database ?? false,
                    checking: false,
                    lastChecked: phTime,
                    latencyMs: latency,
                    errorType: data?.database === false ? "database" : "server",
                });
            }
        } catch {
            const phTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19) + " PST";
            setStatus({
                server: false,
                database: false,
                checking: false,
                lastChecked: phTime,
                latencyMs: null,
                errorType: "network",
            });
        }
    }, [reset]);

    useEffect(() => {
        checkSystemHealth();
    }, [checkSystemHealth]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 md:p-8 relative overflow-hidden">
            {/* Background Decorative Blur Gradients */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl w-full bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8 relative z-10">
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-border/60 pb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-destructive/15 text-destructive rounded-xl">
                            {status.errorType === "database" ? (
                                <DatabaseZap className="h-6 w-6 animate-pulse" />
                            ) : status.errorType === "network" ? (
                                <WifiOff className="h-6 w-6 animate-pulse" />
                            ) : (
                                <ServerOff className="h-6 w-6 animate-pulse" />
                            )}
                        </div>
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                System Outage Detected
                            </span>
                            <h2 className="text-xl font-bold text-foreground">VOS Sync Service Monitor</h2>
                        </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium bg-muted text-muted-foreground border border-border">
                        {errorCode}
                    </span>
                </div>

                {/* Main Content */}
                <div className="space-y-4 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                        {title}
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Live System Diagnostics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Server Status Card */}
                    <div className="bg-muted/40 border border-border/70 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <ServerOff className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Web Server</p>
                                <p className="text-sm font-semibold text-foreground">
                                    {status.server ? "Operational" : "Offline / Unreachable"}
                                </p>
                            </div>
                        </div>
                        {status.server ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                    </div>

                    {/* Database Status Card */}
                    <div className="bg-muted/40 border border-border/70 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <DatabaseZap className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Database Backend</p>
                                <p className="text-sm font-semibold text-foreground">
                                    {status.database ? "Connected" : "Disconnected / Maintenance"}
                                </p>
                            </div>
                        </div>
                        {status.database ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <ShieldAlert className="h-5 w-5 text-destructive animate-bounce" />
                        )}
                    </div>
                </div>

                {/* Diagnostic Details & Timestamp */}
                <div className="bg-muted/20 border border-border/40 rounded-xl p-4 text-xs font-mono space-y-2 text-muted-foreground">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Last Verified (PST):
                        </span>
                        <span className="font-semibold text-foreground">
                            {status.lastChecked || "Checking system..."}
                        </span>
                    </div>
                    {status.latencyMs !== null && (
                        <div className="flex items-center justify-between">
                            <span>Response Latency:</span>
                            <span className="font-semibold text-foreground">{status.latencyMs} ms</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border/60">
                    <Button
                        onClick={checkSystemHealth}
                        disabled={status.checking}
                        variant="default"
                        className="w-full sm:w-auto font-semibold gap-2 shadow-md"
                    >
                        <RefreshCw className={`h-4 w-4 ${status.checking ? "animate-spin" : ""}`} />
                        {status.checking ? "Verifying Services..." : "Retry Connection"}
                    </Button>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button variant="outline" asChild className="w-full sm:w-auto gap-2">
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4" /> Go to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});

ServerDownContent.displayName = "ServerDownContent";
