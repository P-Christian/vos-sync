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
  LockKeyhole 
} from "lucide-react";
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

  const handleDownloadMock = (artifact: ExportArtifactItem) => {
    // Generate simple mock export JSON file download
    const exportData = {
      user_id: artifact.user_id,
      export_version: "1.0",
      generated_at: artifact.generated_at,
      integrity_hash: artifact.integrity_hash,
      data: {
        profile: {
          note: "This is a portable machine-readable JSON copy of your profile data under regulatory requirements.",
          fetched_on: new Date().toISOString()
        }
      }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vos_data_export_${artifact.artifact_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Download started.");
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Data Portability (Export Data)</CardTitle>
            <CardDescription>
              Request a portable machine-readable JSON archive containing all your personal data, profile history, and applications.
            </CardDescription>
          </div>
          <Button 
            onClick={handleCreateExport} 
            disabled={submittingExport}
            className="rounded-xl bg-primary text-primary-foreground font-semibold"
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Request History</h4>
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
                          <p className="text-xs text-zinc-400 mt-1">
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
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            {cancellingId === req.request_id ? "Cancelling..." : "Cancel"}
                          </Button>
                        )}
                        {req.status === "completed" && linkedArtifact && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadMock(linkedArtifact)}
                            className="rounded-lg gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" /> Download (JSON)
                          </Button>
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
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 text-rose-800 dark:text-rose-300 text-xs space-y-2">
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
              <Label htmlFor="deactivate-confirm-input" className="text-xs font-semibold">
                To confirm, type <span className="font-bold text-rose-600">DEACTIVATE</span> in the input below:
              </Label>
              <Input
                id="deactivate-confirm-input"
                placeholder="Type DEACTIVATE"
                value={deactivateInput}
                onChange={(e) => setDeactivateInput(e.target.value)}
                className="h-10 text-sm rounded-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={submittingDeactivate || deactivateInput !== "DEACTIVATE"}
              variant="destructive"
              className="rounded-xl px-5 font-semibold"
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
