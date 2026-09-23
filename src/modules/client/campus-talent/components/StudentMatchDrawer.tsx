"use client";
// src/modules/client/campus-talent/components/StudentMatchDrawer.tsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  GraduationCap,
  Zap,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Target,
  Send,
  Sparkles,
  Info,
  Award,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CampusMatchResult,
  DeterministicGap,
} from "@/modules/matching-engine/campus/types";

interface StudentMatchDrawerProps {
  result: CampusMatchResult | null;
  onClose: () => void;
  onInvite: (result: CampusMatchResult) => void;
}

function ScoreRing({
  score,
  eligible,
}: {
  score: number;
  eligible: boolean;
}) {
  const color =
    score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#94a3b8";

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = eligible
    ? circumference - (score / 100) * circumference
    : circumference;

  return (
    <div className="relative h-20 w-20 flex-shrink-0">
      <svg
        className="rotate-[-90deg]"
        viewBox="0 0 76 76"
        width={76}
        height={76}
      >
        <circle
          cx={38}
          cy={38}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-muted/60"
        />

        <motion.circle
          cx={38}
          cy={38}
          r={radius}
          fill="none"
          stroke={eligible ? color : "#ef4444"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{
            strokeDashoffset: circumference,
          }}
          animate={{
            strokeDashoffset: offset,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.15,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xl font-bold text-foreground tabular-nums"
          style={{
            color: eligible ? color : "#ef4444",
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.25,
            duration: 0.25,
          }}
        >
          {eligible ? score : "—"}
        </motion.span>

        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground leading-none">
          score
        </span>
      </div>
    </div>
  );
}

function GapBadge({ gap }: { gap: DeterministicGap }) {
  if (gap.status === "NOT_EVIDENCED") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">{gap.requirementLabel}</strong> — Not evidenced (candidate has not yet registered a full profile on VOS Sync)
        </span>
      </div>
    );
  }

  if (gap.status === "NOT_MATCHED") {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">{gap.requirementLabel}</strong> — Requirement not matched in student curriculum or profile
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
      <span className="text-destructive leading-relaxed font-medium">
        <strong>{gap.requirementLabel}</strong> — Mandatory qualification criteria not met
      </span>
    </div>
  );
}

const sectionVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

function StudentMatchDrawerContent({
  result,
  onClose,
  onInvite,
}: {
  result: CampusMatchResult;
  onClose: () => void;
  onInvite: (r: CampusMatchResult) => void;
}) {
  const canInvite =
    result.eligibility.eligible &&
    result.invitationStatus !== "Invited" &&
    result.invitationStatus !== "Registered";

  const curriculumItems = result.evidence.curriculum ?? [];
  const verifiedSkills = result.evidence.verifiedSkills ?? [];
  const experience = result.evidence.experience ?? [];
  const gaps = result.gaps ?? [];
  const explanation = result.explanation ?? null;

  const initials = result.studentName
    ? result.studentName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  const getScoreVerdict = (score: number, eligible: boolean) => {
    if (!eligible) {
      return {
        label: "Ineligible Candidate",
        variant: "destructive" as const,
        description: "Does not meet hard threshold requirements for this position.",
      };
    }
    if (score >= 70) {
      return {
        label: "Strong Academic Fit",
        variant: "default" as const,
        description: "High curriculum & qualification alignment with job requirements.",
      };
    }
    if (score >= 50) {
      return {
        label: "Potential Candidate",
        variant: "secondary" as const,
        description: "Foundational academic coursework aligns with required competencies.",
      };
    }
    return {
      label: "Low Qualification Fit",
      variant: "outline" as const,
      description: "Limited syllabus or verified evidence matching this position.",
    };
  };

  const verdict = getScoreVerdict(
    result.score,
    result.eligibility.eligible
  );

  return (
    <div key="student-drawer-root" className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop Overlay */}
          <motion.div
            key="student-drawer-backdrop"
            className="fixed inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.22,
              ease: "easeOut",
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <motion.div
            key="student-drawer-panel"
            className="fixed right-0 top-0 h-full w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-[820px] bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label={`Match details for ${result.studentName}`}
            initial={{
              x: "100%",
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "100%",
            }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Header: Sticky frosted header */}
            <motion.div
              className="sticky top-0 z-20 backdrop-blur-md bg-background/95 border-b border-border p-6 flex items-start justify-between gap-4"
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              transition={{
                delay: 0.08,
                duration: 0.25,
              }}
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Candidate Initials Avatar */}
                <motion.div
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 text-primary border border-primary/25 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                >
                  {initials}
                </motion.div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-foreground text-xl leading-tight truncate">
                      {result.studentName}
                    </h2>

                    {result.isRegistered && (
                      <Badge
                        variant="secondary"
                        className="text-[11px] gap-1 bg-primary/10 text-primary border-primary/20"
                      >
                        <Zap className="h-3 w-3" />
                        Registered Student
                      </Badge>
                    )}

                    <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                      {result.matchModel}
                    </Badge>

                    {result.invitationStatus === "Invited" && (
                      <Badge variant="secondary" className="text-[11px]">
                        Invited
                      </Badge>
                    )}

                    {result.invitationStatus === "Registered" && (
                      <Badge className="text-[11px]">
                        Registered
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate">{result.email}</span>
                    {result.studentNumber && (
                      <>
                        <span>•</span>
                        <span>ID: {result.studentNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Close"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </motion.div>

            {/* Scrollable Body */}
            <motion.div
              className="flex-1 overflow-y-auto p-6 space-y-6"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.1,
                duration: 0.25,
              }}
            >
              {/* Match Score Hero Card */}
              <motion.div
                className={cn(
                  "rounded-xl border p-5 transition-all flex flex-col sm:flex-row items-center sm:items-start gap-5",
                  result.eligibility.eligible
                    ? result.score >= 70
                      ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : result.score >= 50
                      ? "border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20"
                      : "border-border bg-muted/30"
                    : "border-destructive/30 bg-destructive/5"
                )}
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
                transition={{
                  delay: 0.14,
                  duration: 0.25,
                }}
              >
                <ScoreRing
                  score={result.score}
                  eligible={result.eligibility.eligible}
                />

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <Badge variant={verdict.variant} className="text-xs px-2.5 py-0.5">
                      {verdict.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Evidence Level: <strong className="text-foreground">{result.evidenceLevel.replace(/_/g, " ")}</strong>
                    </span>
                  </div>

                  <p className="text-sm text-foreground font-medium">
                    {verdict.description}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Deterministic score computed using curriculum course taxonomies & verified profile credentials.
                  </p>
                </div>
              </motion.div>

              {/* Academic & Profile KPI Grid (4-Column Layout) */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
                transition={{
                  delay: 0.18,
                  duration: 0.25,
                }}
              >
                <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    <span>Degree Course</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm truncate" title={result.courseName ?? "Unknown"}>
                    {result.courseName ?? "Unknown Course"}
                  </p>
                </div>

                <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>Academic Year</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {result.schoolYear || "Not Specified"}
                  </p>
                </div>

                <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    <span>Cumulative GPA</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {result.gpa !== null ? result.gpa.toFixed(2) : "Not Disclosed"}
                  </p>
                </div>

                <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Verification</span>
                  </div>
                  <p className="font-semibold text-foreground text-sm truncate">
                    {result.isRegistered ? "Verified User" : "School Roster"}
                  </p>
                </div>
              </motion.div>

              {/* Ineligibility Warning Alert */}
              {!result.eligibility.eligible && (
                <motion.div
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2.5"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  transition={{
                    delay: 0.22,
                    duration: 0.25,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm font-semibold text-destructive">
                      Disqualification Warning
                    </p>
                  </div>

                  <div className="space-y-1 pl-6">
                    {result.eligibility.reasons.map((r, i) => (
                      <p key={i} className="text-xs text-destructive/90">
                        • {r}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Grounded AI Match Analysis (Gemini Explanation) */}
              {explanation && (
                <motion.div
                  className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4 shadow-2xs"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  transition={{
                    delay: 0.26,
                    duration: 0.25,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-primary/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-bold text-foreground">
                        AI Match Analysis & Recruiter Guidance
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-background/50 border-primary/25">
                      Grounded Synthesis
                    </Badge>
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {explanation.summary}
                  </p>

                  {/* 2-Column Responsive Layout for Strengths vs Gaps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Strengths */}
                    {explanation.strengths.length > 0 && (
                      <div className="bg-background/60 border border-emerald-500/20 rounded-lg p-3.5 space-y-2">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Key Strengths
                        </p>
                        <ul className="space-y-1.5">
                          {explanation.strengths.map((s, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-foreground/85 leading-normal"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gap Analysis */}
                    {explanation.gapAnalysis.length > 0 && (
                      <div className="bg-background/60 border border-amber-500/20 rounded-lg p-3.5 space-y-2">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Gap Analysis & Considerations
                        </p>
                        <ul className="space-y-1.5">
                          {explanation.gapAnalysis.map((g, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-muted-foreground leading-normal"
                            >
                              <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Inferred Curriculum Competencies */}
              {curriculumItems.length > 0 && (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  transition={{
                    delay: 0.3,
                    duration: 0.25,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">
                        Inferred Curriculum Competencies
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Inferred from Course Syllabus
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {curriculumItems.map((item, i) => (
                      <motion.span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs font-medium text-foreground/80 border border-border/80 shadow-2xs"
                        initial={{
                          opacity: 0,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                        }}
                        transition={{
                          delay: 0.32 + i * 0.02,
                          duration: 0.18,
                        }}
                        whileHover={{
                          y: -1,
                          scale: 1.02,
                        }}
                      >
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        {item.label}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Verified Skills */}
              {verifiedSkills.length > 0 && (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  transition={{
                    delay: 0.34,
                    duration: 0.25,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-semibold text-foreground">
                        Verified Skills & Endorsements
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Profile
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {verifiedSkills.map((item, i) => (
                      <motion.span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                        initial={{
                          opacity: 0,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                        }}
                        transition={{
                          delay: 0.36 + i * 0.02,
                          duration: 0.18,
                        }}
                        whileHover={{
                          y: -1,
                          scale: 1.02,
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {item.label}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Work Experience */}
              {experience.length > 0 && (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  transition={{
                    delay: 0.38,
                    duration: 0.25,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Work Experience & Roles
                    </p>
                  </div>

                  <div className="space-y-2">
                    {experience.map((item, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-foreground"
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Gaps & Hard Requirements */}
              {gaps.length > 0 && (
                <motion.div
                  className="space-y-3 pt-2"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                  transition={{
                    delay: 0.42,
                    duration: 0.25,
                  }}
                >
                  <Separator className="mb-4" />

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">
                      Gaps & Qualification Checks
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {gaps.length} item{gaps.length !== 1 ? "s" : ""} evaluated
                    </span>
                  </div>

                  <div className="space-y-2">
                    {gaps.map((gap, i) => (
                      <motion.div
                        key={i}
                        initial={{
                          opacity: 0,
                          x: -6,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: 0.44 + i * 0.03,
                          duration: 0.2,
                        }}
                      >
                        <GapBadge gap={gap} />
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground/80 pt-1">
                    * &quot;Not evidenced&quot; indicates information is absent from university roster records — it does not verify lack of skill.
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Footer: Sticky action bar */}
            <motion.div
              className="sticky bottom-0 z-20 backdrop-blur-md bg-background/95 border-t border-border p-4 px-6 flex items-center justify-between gap-4 shrink-0"
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
                duration: 0.25,
              }}
            >
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Model: <strong className="text-foreground font-medium">{result.matchModel}</strong>
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Close
                </Button>

                {canInvite && (
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                  >
                    <Button
                      onClick={() => onInvite(result)}
                      className="gap-2 shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send Invitation</span>
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
  );
}

export default function StudentMatchDrawer({
  result,
  onClose,
  onInvite,
}: StudentMatchDrawerProps) {
  return (
    <AnimatePresence>
      {result && (
        <StudentMatchDrawerContent
          result={result}
          onClose={onClose}
          onInvite={onInvite}
        />
      )}
    </AnimatePresence>
  );
}
