 "use client";

// src/modules/client/campus-talent/components/StudentMatchTable.tsx

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Send,
  GraduationCap,
  Zap,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  CampusCandidate,
  CampusMatchResult,
} from "@/modules/matching-engine/campus/types";

interface StudentMatchTableProps {
  candidates: CampusCandidate[];
  matchResults: CampusMatchResult[];
  showScores: boolean;
  onViewDetails: (result: CampusMatchResult) => void;
  onInvite: (result: CampusMatchResult) => void;
}

function getScoreColor(score: number): string {
  if (score >= 70) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (score >= 50) {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-muted-foreground";
}

function getScoreBg(score: number): string {
  if (score >= 70) {
    return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
  }

  if (score >= 50) {
    return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
  }

  return "bg-muted border-border";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Strong match";
  if (score >= 50) return "Potential match";
  return "Low match";
}

function InvitationBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() ?? "not sent";

  if (normalized === "invited") {
    return (
      <Badge
        variant="secondary"
        className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium"
      >
        <Mail className="h-3 w-3" />
        Invited
      </Badge>
    );
  }

  if (normalized === "registered") {
    return (
      <Badge
        variant="default"
        className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium"
      >
        <CheckCircle2 className="h-3 w-3" />
        Registered
      </Badge>
    );
  }

  return (
    <span className="text-[11px] text-muted-foreground">
      Not invited
    </span>
  );
}

const rowVariants = {
  hidden: {
    opacity: 0,
    x: -28,
  },
  visible: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -16,
  },
};

const tableHeaderClass =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export default function StudentMatchTable({
  candidates,
  matchResults,
  showScores,
  onViewDetails,
  onInvite,
}: StudentMatchTableProps) {
  const resultMap = useMemo(() => {
    const map = new Map<number, CampusMatchResult>();

    for (const result of matchResults) {
      map.set(result.candidateId, result);
    }

    return map;
  }, [matchResults]);

  const rows: CampusMatchResult[] = useMemo(() => {
    if (showScores && matchResults.length > 0) {
      return matchResults;
    }

    return candidates.map(
      (candidate): CampusMatchResult => ({
        candidateId: candidate.studentId,
        studentNumber: candidate.studentNumber,
        studentName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        courseName: candidate.courseName,
        schoolYear: candidate.schoolYear,
        gpa: candidate.gpa,
        isRegistered: candidate.isRegistered,
        registeredUserId: candidate.isRegistered
          ? candidate.registeredUserId
          : null,
        invitationStatus: candidate.invitationStatus,
        matchModel: "ACADEMIC",
        evidenceLevel: candidate.isRegistered
          ? "ACADEMIC_ENRICHED"
          : "ACADEMIC_ONLY",
        score: 0,
        eligibility: {
          eligible: true,
          reasons: [],
        },
        evidence: {
          curriculum: [],
          verifiedSkills: [],
          experience: [],
          responsibilities: [],
        },
        gaps: [],
        explanation: null,
      }),
    );
  }, [candidates, matchResults, showScores]);

  if (rows.length === 0) {
    return (
      <motion.div
        className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-6 text-center"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.25,
          ease: "easeOut",
        }}
      >
        <motion.div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Users className="h-5 w-5 text-muted-foreground" />
        </motion.div>

        <h3 className="text-sm font-semibold text-foreground">
          No students found
        </h3>

        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          There are no students matching the current filters or
          search criteria.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={tableHeaderClass}>Student</th>

              <th className={tableHeaderClass}>
                Course / Year
              </th>

              {showScores && (
                <>
                  <th
                    className={cn(
                      tableHeaderClass,
                      "text-center",
                    )}
                  >
                    Match
                  </th>

                  <th className={tableHeaderClass}>
                    Status
                  </th>
                </>
              )}

              <th
                className={cn(
                  tableHeaderClass,
                  "text-right",
                )}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            <AnimatePresence
              mode="popLayout"
              initial={false}
            >
              {rows.map((row, index) => {
                const hasMatch = resultMap.has(
                  row.candidateId,
                );

                const isEligible =
                  row.eligibility.eligible;

                return (
                  <motion.tr
                    key={row.candidateId}
                    layout
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{
                      duration: 0.28,
                      delay: Math.min(index * 0.035, 0.28),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                      "group relative transition-colors duration-150",
                      "hover:bg-muted/30",
                      showScores &&
                        !isEligible &&
                        "bg-muted/10 opacity-65",
                    )}
                  >
                    {/* Student */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className={cn(
                            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            "bg-primary/10 ring-1 ring-primary/10",
                            "transition-colors duration-150",
                            "group-hover:bg-primary/15",
                          )}
                          whileHover={{
                            scale: 1.06,
                          }}
                          transition={{
                            duration: 0.15,
                          }}
                        >
                          <span className="text-xs font-bold text-primary">
                            {row.studentName
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          {row.isRegistered && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary ring-2 ring-background">
                              <Zap className="h-2 w-2 text-primary-foreground" />
                            </span>
                          )}
                        </motion.div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium leading-tight text-foreground">
                              {row.studentName}
                            </p>

                            {hasMatch && showScores && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  scale: 0.7,
                                }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                }}
                                transition={{
                                  delay: 0.15,
                                }}
                              >
                                <Sparkles className="h-3 w-3 text-primary" />
                              </motion.div>
                            )}
                          </div>

                          <p className="mt-0.5 max-w-[240px] truncate text-xs text-muted-foreground">
                            {row.email}
                          </p>

                          {row.studentNumber && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                              {row.studentNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Course / Year */}
                    <td className="px-4 py-3.5">
                      <p className="max-w-[230px] truncate font-medium text-foreground">
                        {row.courseName ?? (
                          <span className="font-normal italic text-muted-foreground">
                            Unknown course
                          </span>
                        )}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {row.schoolYear}
                        </span>

                        {row.gpa !== null && (
                          <>
                            <span className="text-muted-foreground/40">
                              •
                            </span>

                            <span className="text-xs text-muted-foreground">
                              GPA{" "}
                              <span className="font-medium text-foreground">
                                {row.gpa.toFixed(2)}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Score */}
                    {showScores && (
                      <>
                        <td className="px-4 py-3.5">
                          {isEligible ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <motion.div
                                className={cn(
                                  "relative flex h-11 w-11 items-center justify-center rounded-full border-2",
                                  "font-bold tabular-nums",
                                  getScoreBg(row.score),
                                  getScoreColor(row.score),
                                )}
                                initial={{
                                  opacity: 0,
                                  scale: 0.75,
                                }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                }}
                                transition={{
                                  duration: 0.3,
                                  delay: 0.08,
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 24,
                                }}
                                whileHover={{
                                  scale: 1.08,
                                }}
                              >
                                {row.score}

                                <span className="absolute inset-[-4px] rounded-full border border-transparent transition-colors group-hover:border-primary/10" />
                              </motion.div>

                              <div className="text-center">
                                <p
                                  className={cn(
                                    "text-[10px] font-medium",
                                    getScoreColor(row.score),
                                  )}
                                >
                                  {getScoreLabel(row.score)}
                                </p>

                                <p className="text-[10px] text-muted-foreground">
                                  {row.matchModel}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <motion.div
                              className="flex flex-col items-center gap-1.5"
                              initial={{
                                opacity: 0,
                                scale: 0.8,
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                              }}
                            >
                              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
                                <XCircle className="h-5 w-5 text-destructive" />
                              </div>

                              <span className="text-[10px] font-medium text-destructive">
                                Ineligible
                              </span>
                            </motion.div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <div className="max-w-[260px] space-y-1.5">
                            {!isEligible &&
                              row.eligibility.reasons.length >
                                0 && (
                                <div className="flex items-start gap-2 rounded-lg border border-destructive/15 bg-destructive/5 px-2.5 py-2">
                                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />

                                  <p className="line-clamp-2 text-[11px] leading-relaxed text-destructive">
                                    {
                                      row.eligibility
                                        .reasons[0]
                                    }
                                  </p>
                                </div>
                              )}

                            {isEligible && (
                              <>
                                <InvitationBadge
                                  status={
                                    row.invitationStatus
                                  }
                                />

                                {row.evidence.curriculum
                                  .length > 0 && (
                                  <motion.div
                                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                                    initial={{
                                      opacity: 0,
                                      x: -4,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                    }}
                                    transition={{
                                      delay: 0.12,
                                    }}
                                  >
                                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />

                                    <span>
                                      {
                                        row.evidence
                                          .curriculum
                                          .length
                                      }{" "}
                                      inferred competencies
                                    </span>
                                  </motion.div>
                                )}

                                {row.evidence
                                  .verifiedSkills.length >
                                  0 && (
                                  <motion.div
                                    className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
                                    initial={{
                                      opacity: 0,
                                      x: -4,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                    }}
                                    transition={{
                                      delay: 0.17,
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />

                                    <span>
                                      {
                                        row.evidence
                                          .verifiedSkills
                                          .length
                                      }{" "}
                                      verified skills
                                    </span>
                                  </motion.div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <motion.div
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
                              "text-muted-foreground",
                              "hover:bg-muted hover:text-foreground",
                            )}
                            onClick={() =>
                              onViewDetails(row)
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">
                              Details
                            </span>
                          </Button>
                        </motion.div>

                        {isEligible &&
                          row.invitationStatus !==
                            "Invited" &&
                          row.invitationStatus !==
                            "Registered" && (
                            <motion.div
                              whileHover={{
                                scale: 1.03,
                              }}
                              whileTap={{
                                scale: 0.96,
                              }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
                                  "border-primary/20",
                                  "hover:border-primary/40 hover:bg-primary/5",
                                )}
                                onClick={() =>
                                  onInvite(row)
                                }
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">
                                  Invite
                                </span>
                              </Button>
                            </motion.div>
                          )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
 
