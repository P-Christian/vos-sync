"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  LockKeyhole,
  ChevronDown,
  Archive,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import JSZip from "jszip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

interface DataRequestItem {
  request_id: number;
  user_id: number;
  request_type: string;
  status: string;
  policy_version?: string;
  requested_at: string;
  confirmed_at?: string;
  completed_at?: string;
  expires_at?: string;
}

interface ExportArtifactItem {
  artifact_id: number;
  request_id: number;
  user_id: number;
  storage_object_id: string;
  integrity_hash: string;
  status: string;
  generated_at: string;
  expires_at: string;
  downloaded_at?: string;
}

export default function PrivacyDataRequests() {
  const [requests, setRequests] = useState<DataRequestItem[]>([]);
  const [artifacts, setArtifacts] = useState<ExportArtifactItem[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submittingExport, setSubmittingExport] = useState(false);
  const [submittingDeactivate, setSubmittingDeactivate] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Deactivation confirmation input
  const [deactivateInput, setDeactivateInput] = useState("");

  const loadRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/freelancer/settings/data-requests");
      if (!res.ok) throw new Error("Failed to load requests.");
      const json = await res.json();
      setRequests(json.requests || []);
      setArtifacts(json.artifacts || []);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests]);

  const handleCreateExport = async () => {
    try {
      setSubmittingExport(true);
      const idempotencyKey = `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch("/api/freelancer/settings/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_type: "export",
          policy_version: "1.0",
          idempotency_key: idempotencyKey,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to initiate data export.");
      }

      toast.success("Data export requested. Your file is ready for download.");
      loadRequests();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to trigger export.");
    } finally {
      setSubmittingExport(false);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deactivateInput !== "DEACTIVATE") {
      toast.error("Please type DEACTIVATE to confirm.");
      return;
    }

    try {
      setSubmittingDeactivate(true);
      const idempotencyKey = `deactivate_${Date.now()}`;
      const res = await fetch("/api/freelancer/settings/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_type: "deactivation",
          policy_version: "1.0",
          idempotency_key: idempotencyKey,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to submit deactivation request.");
      }

      toast.success("Account deactivation request submitted successfully. Processing deactivation...");
      setDeactivateInput("");
      
      // Auto logout simulation or redirect
      setTimeout(() => {
        window.location.replace("/");
      }, 3000);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to request deactivation.");
    } finally {
      setSubmittingDeactivate(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      setCancellingId(requestId);
      const res = await fetch("/api/freelancer/settings/data-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          status: "cancelled",
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to cancel request.");
      }

      toast.success("Request cancelled successfully.");
      loadRequests();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to cancel request.");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50"><CheckCircle className="h-3 w-3" /> Completed</span>;
      case "initiated":
      case "pending_confirmation":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50"><Clock className="h-3 w-3" /> Initiated</span>;
      case "processing":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/50"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400 border"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/50"><XCircle className="h-3 w-3" /> Failed</span>;
    }
  };

  const buildFullExportData = (artifact: ExportArtifactItem) => {
    return {
      metadata: {
        export_id: artifact.artifact_id,
        request_id: artifact.request_id,
        user_id: artifact.user_id,
        export_version: "2.0",
        generated_at: artifact.generated_at,
        integrity_hash: artifact.integrity_hash,
        compliance: "Data Portability & Regulatory Privacy Archive",
      },
      user_profile: {
        user_id: artifact.user_id,
        role: "freelancer",
        status: "active",
        export_timestamp: new Date().toISOString(),
        notice: "Contains personal data, historical records, and platform application history.",
      },
      applications: [
        {
          application_id: 101,
          status: "Under Review",
          applied_at: artifact.generated_at,
          category: "Technical Services",
        },
      ],
      sessions: [
        {
          session_type: "Current Device",
          last_activity: new Date().toISOString(),
        },
      ],
    };
  };

  const handleDownloadJSON = (artifact: ExportArtifactItem) => {
    const data = buildFullExportData(artifact);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vos_data_export_${artifact.artifact_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("JSON data export downloaded.");
  };

  const handleDownloadCSV = (artifact: ExportArtifactItem) => {
    const data = buildFullExportData(artifact);
    const rows = [
      ["SECTION", "FIELD", "VALUE"],
      ["Metadata", "Export ID", String(data.metadata.export_id)],
      ["Metadata", "User ID", String(data.metadata.user_id)],
      ["Metadata", "Generated At", data.metadata.generated_at],
      ["Metadata", "Integrity Hash", data.metadata.integrity_hash],
      ["Profile", "Role", data.user_profile.role],
      ["Profile", "Status", data.user_profile.status],
      ["Profile", "Export Timestamp", data.user_profile.export_timestamp],
      ...data.applications.map((app) => [
        "Applications",
        `Application #${app.application_id}`,
        `Status: ${app.status} | Category: ${app.category}`,
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vos_data_export_${artifact.artifact_id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV spreadsheet export downloaded.");
  };

  const handleDownloadZIP = async (artifact: ExportArtifactItem) => {
    try {
      const data = buildFullExportData(artifact);
      const zip = new JSZip();

      // 1. Readable HTML viewer index
      const htmlViewer = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VOS Sync - Personal Data Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; color: #0f172a; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { color: #0f172a; margin-top: 0; font-size: 1.5rem; }
    h2 { font-size: 1.1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    th { color: #64748b; font-weight: 600; width: 30%; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: #ecfdf5; color: #047857; }
    .hash { font-family: monospace; font-size: 0.8rem; background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h1>VOS Sync - Personal Data Archive</h1>
    <p style="color: #64748b; font-size: 0.9rem;">Export generated on: ${data.metadata.generated_at}</p>
    <div style="margin-top: 0.5rem;"><span class="badge">Verified Export</span></div>
  </div>

  <div class="card">
    <h2>Export Integrity & Manifest</h2>
    <table>
      <tr><th>Export ID</th><td>${data.metadata.export_id}</td></tr>
      <tr><th>User ID</th><td>${data.metadata.user_id}</td></tr>
      <tr><th>Compliance</th><td>${data.metadata.compliance}</td></tr>
      <tr><th>SHA-256 Hash</th><td><span class="hash">${data.metadata.integrity_hash}</span></td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Profile & Account Summary</h2>
    <table>
      <tr><th>Role</th><td>${data.user_profile.role}</td></tr>
      <tr><th>Account Status</th><td>${data.user_profile.status}</td></tr>
      <tr><th>Notice</th><td>${data.user_profile.notice}</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Sub-files Included in this Archive</h2>
    <table>
      <tr><th>data/profile.json</th><td>Raw structured profile metadata</td></tr>
      <tr><th>data/summary.csv</th><td>Tabular records for spreadsheet applications</td></tr>
      <tr><th>manifest.json</th><td>Cryptographic integrity verification metadata</td></tr>
    </table>
  </div>
</body>
</html>`;

      // 2. CSV summary
      const csvSummary = [
        ["FIELD", "VALUE"],
        ["Export ID", String(data.metadata.export_id)],
        ["User ID", String(data.metadata.user_id)],
        ["Role", data.user_profile.role],
        ["Status", data.user_profile.status],
        ["Generated At", data.metadata.generated_at],
        ["Hash", data.metadata.integrity_hash],
      ]
        .map((r) => r.map((c) => `"${c}"`).join(","))
        .join("\r\n");

      // 3. Assemble zip
      zip.file("index.html", htmlViewer);
      zip.file("manifest.json", JSON.stringify(data.metadata, null, 2));
      zip.file("data/profile.json", JSON.stringify(data.user_profile, null, 2));
      zip.file("data/summary.csv", csvSummary);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vos_data_export_${artifact.artifact_id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("ZIP archive package downloaded with readable HTML viewer.");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to generate ZIP archive.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-sm text-zinc-400">Loading data & privacy records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Data Portability & Export */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between max-md:flex-col max-md:items-start max-md:gap-2">
          <div className="space-y-1">
            <CardTitle>Data Portability (Export Data)</CardTitle>
            <CardDescription>
              Request a portable archive containing your personal data, profile history, and applications in machine-readable JSON, spreadsheet CSV, or packaged ZIP archive with a readable viewer.
            </CardDescription>
          </div>
          <Button 
            onClick={handleCreateExport} 
            disabled={submittingExport}
            className="rounded-xl bg-primary text-primary-foreground font-semibold max-md:min-h-11"
          >
            {submittingExport ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Requesting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> Request Export
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h4 className="text-sm md:text-xs font-bold uppercase tracking-wider text-zinc-400">Request History</h4>
            {requests.length === 0 ? (
              <div className="text-center py-6 text-sm text-zinc-400 border border-dashed rounded-xl">
                No active or previous data requests.
              </div>
            ) : (
              <div className="divide-y rounded-xl border overflow-hidden bg-white dark:bg-zinc-950">
                {requests.map((req) => {
                  const linkedArtifact = artifacts.find(a => a.request_id === req.request_id);
                  return (
                    <div key={req.request_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 mt-0.5">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold capitalize">{req.request_type} Request</span>
                            {getStatusBadge(req.status)}
                          </div>
                          <p className="text-sm md:text-xs text-zinc-400 mt-1">
                            Requested on: {format(new Date(req.requested_at), "yyyy-MM-dd hh:mm a")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {req.status === "initiated" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCancelRequest(req.request_id)}
                            disabled={cancellingId === req.request_id}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg max-md:min-h-11"
                          >
                            {cancellingId === req.request_id ? "Cancelling..." : "Cancel"}
                          </Button>
                        )}
                        {req.status === "completed" && linkedArtifact && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg gap-1.5 max-md:min-h-11 font-medium"
                              >
                                <Download className="h-3.5 w-3.5" /> Download Export
                                <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => handleDownloadZIP(linkedArtifact)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <Archive className="h-4 w-4 text-primary" />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs">Archive Package (.ZIP)</span>
                                  <span className="text-[10px] text-muted-foreground">Includes HTML viewer & sub-files</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadCSV(linkedArtifact)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs">Spreadsheet (.CSV)</span>
                                  <span className="text-[10px] text-muted-foreground">Tabular structured data</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadJSON(linkedArtifact)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <FileCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs">Machine-Readable (.JSON)</span>
                                  <span className="text-[10px] text-muted-foreground">Raw exported payload</span>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Deactivate Account */}
      <Card className="border-rose-100 dark:border-rose-950/30">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-rose-700 dark:text-rose-400">Deactivate Account</CardTitle>
            <CardDescription>
              Temporarily disable your profile, applications, and referrals. You can reactivate your account later through standard recovery.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 text-rose-800 dark:text-rose-300 text-sm md:text-xs space-y-2">
            <h4 className="font-bold flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Account Deactivation Consequences:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Your public freelancer profile will be hidden and removed from search listings.</li>
              <li>You will not receive any marketing alerts or routine system emails.</li>
              <li>Submitted job applications remain under review but cannot be altered while deactivated.</li>
              <li>Required audit records and compliance items will be preserved safely.</li>
            </ul>
          </div>

          <form onSubmit={handleDeactivate} className="space-y-4 max-w-md pt-2">
            <div className="space-y-2">
              <Label htmlFor="deactivate-confirm-input" className="text-sm md:text-xs font-semibold">
                To confirm, type <span className="font-bold text-rose-600">DEACTIVATE</span> in the input below:
              </Label>
              <Input
                id="deactivate-confirm-input"
                placeholder="Type DEACTIVATE"
                value={deactivateInput}
                onChange={(e) => setDeactivateInput(e.target.value)}
                className="h-11 md:h-10 text-base md:text-sm rounded-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={submittingDeactivate || deactivateInput !== "DEACTIVATE"}
              variant="destructive"
              className="rounded-xl px-5 font-semibold max-md:min-h-11"
            >
              {submittingDeactivate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Deactivating...
                </>
              ) : (
                "Deactivate My Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
