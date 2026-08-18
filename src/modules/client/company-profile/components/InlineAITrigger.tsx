// src/modules/client/company-profile/components/InlineAITrigger.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
 
  Loader2,
  CheckCircle2,
  Wand2,
  FileCheck2,
  Briefcase,
  Scissors,
  RefreshCw,
  Edit3,
} from "lucide-react";

interface InlineAITriggerProps {
  currentText: string;
  fieldType:
    | "company_description"
    | "company_mission"
    | "company_vision"
    | "company_culture"
    | "company_benefits"
    | "company_tags";
  companyName?: string;
  onRefined: (refinedText: string) => void;
  disabled?: boolean;
}

export default function InlineAITrigger({
  currentText,
  fieldType,
  companyName = "Company",
  onRefined,
  disabled = false,
}: InlineAITriggerProps) {
  const [loading, setLoading] = useState(false);
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");

  const handleAction = async (action: string, customPrompt?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/client/company-profile/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentText,
          action,
          custom_prompt: customPrompt,
          field_type: fieldType,
          company_name: companyName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to refine text.");
      }

      const json = await res.json();
      if (json.refined_text) {
        onRefined(json.refined_text);
      }
    } catch (err) {
      console.error("Inline AI refinement failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPromptText.trim()) return;
    setCustomPromptOpen(false);
    handleAction("custom", customPromptText.trim());
    setCustomPromptText("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || loading}
            className="h-7 px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span className="text-[11px]">Refining...</span>
              </>
            ) : (
              <>
                
                <span className="text-[11px]">AI Assist</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 text-xs p-1">
          <DropdownMenuItem
            onClick={() => handleAction("improve")}
            disabled={loading || !currentText.trim()}
            className="flex items-center gap-2 cursor-pointer py-1.5"
          >
            <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Polish & Improve Writing</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleAction("candidate_focused")}
            disabled={loading || !currentText.trim()}
            className="flex items-center gap-2 cursor-pointer py-1.5"
          >
            <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Make Candidate-Focused</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleAction("professional")}
            disabled={loading || !currentText.trim()}
            className="flex items-center gap-2 cursor-pointer py-1.5"
          >
            <Briefcase className="h-3.5 w-3.5 text-purple-600" />
            <span>More Professional & Corporate</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleAction("shorten")}
            disabled={loading || !currentText.trim()}
            className="flex items-center gap-2 cursor-pointer py-1.5"
          >
            <Scissors className="h-3.5 w-3.5 text-amber-600" />
            <span>Make Concise & Punchy</span>
          </DropdownMenuItem>

          {fieldType === "company_benefits" && (
            <DropdownMenuItem
              onClick={() => handleAction("structure")}
              disabled={loading || !currentText.trim()}
              className="flex items-center gap-2 cursor-pointer py-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
              <span>Format into Clean Perks List</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleAction("regenerate")}
            disabled={loading}
            className="flex items-center gap-2 cursor-pointer py-1.5 text-zinc-700 dark:text-zinc-300"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
            <span>Generate Fresh from Scratch</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCustomPromptOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 cursor-pointer py-1.5 text-zinc-700 dark:text-zinc-300"
          >
            <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
            <span>Custom AI Instruction...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Prompt Dialog */}
      <Dialog open={customPromptOpen} onOpenChange={setCustomPromptOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
            <div className="flex items-center gap-3">
             
              <div>
                <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  Custom AI Refinement
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                  Instruct the AI on specific tone, highlights, or requirements for this field.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCustomSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Textarea
                value={customPromptText}
                onChange={(e) => setCustomPromptText(e.target.value)}
                placeholder="e.g. Highlight our modern engineering practices, hybrid flexibility in BGC, and strong culture of continuous learning..."
                rows={4}
                className="text-xs leading-relaxed resize-none rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                autoFocus
              />
              
              {/* Quick Prompt Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-zinc-400 block">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Focus on candidate career growth & mentorship",
                    "Emphasize technical excellence & modern stack",
                    "Make it punchy, concise, and engaging",
                    "Highlight flexible working setup & work-life balance",
                  ].map((preset, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      onClick={() => setCustomPromptText(preset)}
                      className="cursor-pointer text-[11px] py-1 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors select-none font-normal"
                    >
                      {preset}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomPromptOpen(false)}
                className="h-9 px-4 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!customPromptText.trim()}
                className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-transform active:scale-[0.98]"
              >
                Apply AI Instruction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
