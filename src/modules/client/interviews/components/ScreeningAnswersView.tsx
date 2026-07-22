"use client";

// src/modules/client/interviews/components/ScreeningAnswersView.tsx

import React from "react";
import { ScreeningAnswer } from "../types";
import { HelpCircle, FileText } from "lucide-react";

interface ScreeningAnswersViewProps {
  screeningAnswers?: ScreeningAnswer[] | null;
}

export default function ScreeningAnswersView({
  screeningAnswers,
}: ScreeningAnswersViewProps) {
  if (!screeningAnswers) {
    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
        No screening questions were required for this application.
      </div>
    );
  }

  // Normalize if object map vs array
  let answersList: ScreeningAnswer[] = [];
  if (Array.isArray(screeningAnswers)) {
    answersList = screeningAnswers;
  } else if (typeof screeningAnswers === "object" && screeningAnswers !== null) {
    answersList = Object.entries(screeningAnswers).map(([qText, aText]) => ({
      question_text: qText,
      answer_text: String(aText),
    }));
  }

  if (answersList.length === 0) {
    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
        No screening responses recorded.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        <FileText className="h-4 w-4 text-indigo-500" />
        Candidate Screening Responses ({answersList.length})
      </div>

      <div className="space-y-3">
        {answersList.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5"
          >
            <div className="flex items-start gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>{item.question_text}</span>
            </div>
            <div className="pl-5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg font-mono">
              {item.answer_text || "— No response provided —"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
