/* eslint-disable react-hooks/set-state-in-effect */
// src/app/(vos-sync)/vos-sync/freelancer/referrals/page.tsx
"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ban, Copy, Check } from "lucide-react";

interface ReferralItem {
  referral_id: number;
  job_id?: {
    job_id: number;
    job_title: string;
  };
  display_hint?: string;
  status: string;
  created_at: string;
  expires_at: string;
  token_hash: string;
}

export default function MyReferralsPage() {
  const [referrals, setReferrals] = React.useState<ReferralItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<number | null>(null);

  const fetchReferrals = React.useCallback(async () => {
    try {
      const res = await fetch("/api/freelancer/referrals");
      if (!res.ok) throw new Error("Failed to load referrals");
      const data = await res.json();
      setReferrals(data.referrals || []);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      toast.error("Error loading referrals", { description: errorMsg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopyLink = (referralId: number, tokenHash: string) => {
    // Note: Since plain token is not stored, we generate/use a share link.
    // If user creates a referral without email, the API returns the plain token.
    // For already created ones, we store the sharing structure or token hash lookup path.
    // However, to keep it simple, we redirect to landing which handles token lookup.
    // If the token is hashed, we can fetch or let the user click copy when they create it.
    // We can also let users copy the existing public landing URL.
    const url = `${window.location.origin}/referral/${tokenHash}`;
    navigator.clipboard.writeText(url);
    setCopiedId(referralId);
    toast.success("Link copied", { description: "Referral URL copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this referral invite?")) return;

    try {
      const res = await fetch(`/api/freelancer/referrals/${id}/revoke`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke referral");

      toast.success("Referral Revoked");
      fetchReferrals();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      toast.error("Revocation failed", { description: errorMsg });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Applied</Badge>;
      case "CLAIMED":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Claimed</Badge>;
      case "SENT":
      case "SHARED":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Sent</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">Revoked</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16">
        <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:px-4 overflow-hidden">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="hidden sm:block mr-2 data-[orientation=vertical]:h-4 shrink-0" />
          <div className="min-w-0 overflow-hidden">
            <Breadcrumb>
              <BreadcrumbList className="min-w-0 overflow-hidden">
                <BreadcrumbItem className="hidden md:block shrink-0">
                  <BreadcrumbLink href="#">Freelancer</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block shrink-0" />
                <BreadcrumbItem className="min-w-0 overflow-hidden">
                  <BreadcrumbPage className="truncate max-w-[56vw]">
                    Referrals
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
              <p className="text-muted-foreground mt-1">
                Invite friends and candidates to view open vacancies and track their application progress.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>My Shared Links</CardTitle>
              <CardDescription>
                A list of referrals you have created. You can revoke invitations that haven&apos;t been claimed yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Loading referrals...</div>
              ) : referrals.length === 0 ? (
                <div className="py-16 text-center border rounded-xl border-dashed flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg">
                    🔗
                  </div>
                  <h3 className="font-semibold text-lg">No referrals yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Go to the jobs page to refer candidates and friends to active vacancies.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Recipient Hint</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((ref) => {
                        const canRevoke = ref.status !== "CLAIMED" && ref.status !== "APPLIED" && ref.status !== "REVOKED" && ref.status !== "EXPIRED";
                        return (
                          <TableRow key={ref.referral_id}>
                            <TableCell className="font-medium">
                              {ref.job_id?.job_title || "Unknown position"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {ref.display_hint || "Public share link"}
                            </TableCell>
                            <TableCell>{getStatusBadge(ref.status)}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(ref.expires_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyLink(ref.referral_id, ref.token_hash)}
                                  className="h-8 gap-1"
                                >
                                  {copiedId === ref.referral_id ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </Button>
                                {canRevoke && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevoke(ref.referral_id)}
                                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Revoke</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
