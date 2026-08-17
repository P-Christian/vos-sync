// src/modules/client/dashboard/components/ActionRequiredCard.tsx
"use client";

import React, { useState, useCallback } from "react";
import { ActionRequiredItem } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ActionRequiredCardProps {
  initialActions?: ActionRequiredItem[];
}

export default function ActionRequiredCard({ initialActions = [] }: ActionRequiredCardProps) {
  const router = useRouter();
  // Optimistic UI state for action list
  const [actions, setActions] = useState<ActionRequiredItem[]>(initialActions);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistically remove from state
    setDismissedIds((prev) => new Set([...prev, id]));
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleActionClick = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  const visibleActions = actions.filter((a) => !dismissedIds.has(a.id));

  const getIcon = (item: ActionRequiredItem) => {
    if (item.severity === "success") {
      return <ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0" />;
    }
    if (item.type === "unreviewed_applicants") {
      return <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
    }
    if (item.type === "interview_pending" || item.type === "interview_outcome_pending") {
      return <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
    }
    if (item.type === "job_expiring") {
      return <Briefcase className="h-4.5 w-4.5 text-blue-500 shrink-0" />;
    }
    return <AlertTriangle className="h-4.5 w-4.5 text-muted-foreground shrink-0" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Card className="border bg-card rounded-2xl py-0 shadow-2xs overflow-hidden flex flex-col justify-between h-full">
        <div>
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground">Action Required</CardTitle>
                {visibleActions.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    {visibleActions.length}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {visibleActions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                <p className="font-semibold text-foreground">All caught up!</p>
                <p className="text-[11px]">No urgent hiring actions require your attention.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {visibleActions.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.25 }}
                    >
                      <div
                        onClick={() => handleActionClick(item.actionUrl)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex items-start justify-between gap-3 ${
                          item.severity === "success"
                            ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                            : "bg-muted/20 border-border/80 hover:bg-muted/50 hover:border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5">{getIcon(item)}</div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            <div className="pt-1.5">
                              <span className="inline-flex items-center text-[11px] font-semibold text-primary group-hover:underline">
                                {item.actionLabel}
                                <ChevronRight className="h-3 w-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.dismissible && (
                          <button
                            type="button"
                            onClick={(e) => handleDismiss(item.id, e)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="Dismiss notification"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Prioritized next steps</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/vos-sync/client/notifications")}
            className="text-xs font-semibold h-8 rounded-lg"
          >
            Notification Center
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
