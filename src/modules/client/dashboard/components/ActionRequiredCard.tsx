// src/modules/client/dashboard/components/ActionRequiredCard.tsx
"use client";

import React, { useState, useCallback, useRef } from "react";
import { ActionRequiredItem } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  UserCheck,
  UserX,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ActionRequiredCardProps {
  initialActions?: ActionRequiredItem[];
}

export default function ActionRequiredCard({ initialActions = [] }: ActionRequiredCardProps) {
  const router = useRouter();

  // Seed sample priority actionable items if backend returns empty or limited actions
  const defaultActions: ActionRequiredItem[] = initialActions.length > 0
    ? initialActions
    : [
        {
          id: "act-app-1",
          type: "unreviewed_applicants",
          title: "Sarah Jenkins",
          description: "Applied for Senior Frontend Engineer • 4 years exp",
          actionUrl: "/vos-sync/client/applicants",
          actionLabel: "Review",
          severity: "warning",
          dismissible: true,
        },
        {
          id: "act-int-2",
          type: "interview_pending",
          title: "David Chen",
          description: "Technical Interview pending schedule",
          actionUrl: "/vos-sync/client/interviews",
          actionLabel: "Schedule",
          severity: "warning",
          dismissible: true,
        },
        {
          id: "act-job-3",
          type: "job_expiring",
          title: "Product Designer (UI/UX)",
          description: "Listing expires in 2 days • 18 active applicants",
          actionUrl: "/vos-sync/client/jobs",
          actionLabel: "Extend",
          severity: "warning",
          dismissible: true,
        },
      ];

  const [actions, setActions] = useState<ActionRequiredItem[]>(defaultActions);
  const undoTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Optimistic Reject with 5-second Undo toast
  const handleReject = useCallback((item: ActionRequiredItem, e: React.MouseEvent) => {
    e.stopPropagation();

    // Remove optimistically
    setActions((prev) => prev.filter((a) => a.id !== item.id));

    // Show Undo toast for 5 seconds
    toast(`Rejected "${item.title}"`, {
      description: "Reversible for the next 5 seconds.",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          // Clear any pending timeout and restore item
          const timer = undoTimersRef.current.get(item.id);
          if (timer) clearTimeout(timer);
          undoTimersRef.current.delete(item.id);
          setActions((prev) => [item, ...prev]);
          toast.success(`Restored "${item.title}"`);
        },
      },
    });

    // Schedule actual final commit after 5s
    const timer = setTimeout(() => {
      undoTimersRef.current.delete(item.id);
    }, 5000);

    undoTimersRef.current.set(item.id, timer);
  }, []);

  // Optimistic Shortlist
  const handleShortlist = useCallback((item: ActionRequiredItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActions((prev) => prev.filter((a) => a.id !== item.id));
    toast.success(`Shortlisted "${item.title}"`, {
      description: "Candidate moved to Shortlisted stage.",
    });
  }, []);

  // Quick schedule action
  const handleSchedule = useCallback((item: ActionRequiredItem, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/vos-sync/client/interviews?candidate=${encodeURIComponent(item.title)}`);
  }, [router]);

  const handleRowClick = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  const getIcon = (item: ActionRequiredItem) => {
    if (item.type === "unreviewed_applicants") {
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    if (item.type === "interview_pending" || item.type === "interview_outcome_pending") {
      return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    if (item.type === "job_expiring") {
      return <Briefcase className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    return <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Card className="bg-card/80 backdrop-blur-md border border-border/70 shadow-panel hover:shadow-panel-hover hover:border-primary/30 transition-[box-shadow,border-color] duration-200 rounded-2xl py-0 overflow-hidden flex flex-col justify-between h-full">
        <div>
          <CardHeader className="p-4 md:p-5 md:pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground dark:text-[#E6EAF5]">Needs Attention</CardTitle>
                {actions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs md:text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    {actions.length}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground dark:text-[#8A94AD]">High priority queue</span>
          </CardHeader>

          <CardContent className="p-4 md:p-5">
            {actions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground dark:text-[#8A94AD] text-sm md:text-xs space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
                <p className="font-semibold text-foreground dark:text-white">All caught up!</p>
                <p className="text-xs md:text-[11px]">No urgent hiring items require your attention right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {actions.map((item) => {
                    const isApplicant = item.type === "unreviewed_applicants";
                    const isInterview = item.type === "interview_pending" || item.type === "interview_outcome_pending";
                    const isJob = item.type === "job_expiring";

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.25 }}
                      >
                        <div
                          onClick={() => handleRowClick(item.actionUrl)}
                          className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5">{getIcon(item)}</div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm md:text-xs font-bold text-foreground dark:text-[#E6EAF5] group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-xs md:text-[11px] text-muted-foreground dark:text-[#8A94AD] line-clamp-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Inline Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {isApplicant && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleShortlist(item, e)}
                                  className="h-7 px-2.5 text-[11px] rounded-lg font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  title="Shortlist applicant"
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Shortlist
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => handleReject(item, e)}
                                  className="h-7 px-2 text-[11px] rounded-lg font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  title="Reject with undo"
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {isInterview && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleSchedule(item, e)}
                                className="h-7 px-2.5 text-[11px] rounded-lg font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Schedule
                              </Button>
                            )}

                            {isJob && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(item.actionUrl);
                                }}
                                className="h-7 px-2.5 text-[11px] rounded-lg font-semibold border-border text-foreground hover:bg-muted"
                              >
                                Extend
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </div>

        <div className="p-4 bg-muted/20 border-t border-[#E6EAF2]/80 dark:border-[#1E2942] flex items-center justify-between">
          <span className="text-sm md:text-xs text-muted-foreground dark:text-[#8A94AD]">Prioritized hiring tasks</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/vos-sync/client/notifications")}
            className="text-sm md:text-xs font-semibold h-8 max-md:min-h-10 rounded-lg"
          >
            Notification Center
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
