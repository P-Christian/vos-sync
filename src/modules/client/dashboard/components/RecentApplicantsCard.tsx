// src/modules/client/dashboard/components/RecentApplicantsCard.tsx
"use client";

import React, { useCallback } from "react";
import { RecentApplicantItem } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, ArrowRight, CheckCircle2, Clock, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface RecentApplicantsCardProps {
  applicants: RecentApplicantItem[];
}

export default function RecentApplicantsCard({ applicants }: RecentApplicantsCardProps) {
  const router = useRouter();

  const handleNavigateAll = useCallback(() => {
    router.push("/vos-sync/client/applicants");
  }, [router]);

  const handleNavigateApplicant = useCallback((appId: number) => {
    router.push(`/vos-sync/client/applicants?applicantId=${appId}`);
  }, [router]);

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || "C").toUpperCase();
  };

  const formatAppliedTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr.replace(" ", "T"));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "SHORTLISTED") {
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold tracking-wide"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Shortlisted
        </Badge>
      );
    }
    if (s === "INTERVIEWING") {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px] font-semibold tracking-wide"
        >
          <Calendar className="h-3 w-3 mr-1" />
          Interviewing
        </Badge>
      );
    }
    if (s === "HIRED") {
      return (
        <Badge
          variant="secondary"
          className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-[10px] font-semibold tracking-wide"
        >

          Hired
        </Badge>
      );
    }
    if (s === "UNDER_REVIEW") {
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold tracking-wide"
        >
          <Clock className="h-3 w-3 mr-1" />
          Under Review
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold tracking-wide"
      >
        New Application
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Card className="border bg-card rounded-2xl shadow-2xs overflow-hidden flex flex-col justify-between h-full py-0">
        <div>
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">Recent Applicants</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateAll}
              className="text-xs font-semibold text-primary hover:text-primary/90 h-8 px-2.5 flex items-center gap-1 group"
            >
              Review Candidates
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {applicants.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs">
                No recent candidate applications.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                <div className="grid grid-cols-12 px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                  <span className="col-span-5">Candidate</span>
                  <span className="col-span-4">Applied For</span>
                  <span className="col-span-3 text-right">Status</span>
                </div>

                {applicants.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => handleNavigateApplicant(candidate.id)}
                    className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group text-xs"
                  >
                    <div className="col-span-5 flex items-center gap-3 pr-2 min-w-0">
                      <Avatar className="h-8 w-8 border border-border/80 shrink-0">
                        {candidate.avatarUrl && (
                          <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {candidate.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {candidate.experience || candidate.email}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-4 pr-2 min-w-0">
                      <p className="font-medium text-foreground truncate">{candidate.jobTitle}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatAppliedTime(candidate.appliedDate)}
                      </span>
                    </div>

                    <div className="col-span-3 text-right">
                      {renderStatusBadge(candidate.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Activity across active postings</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigateAll}
            className="text-xs font-semibold h-8 rounded-lg"
          >
            Review Candidates
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
