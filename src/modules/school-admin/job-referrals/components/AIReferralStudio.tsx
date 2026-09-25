// src/modules/school-admin/job-referrals/components/AIReferralStudio.tsx
"use client";

import React, { useState } from 'react';
import { LetterTone } from '../types/job-referrals.types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Eye,
  Edit3,
  Briefcase,
  GraduationCap,
  Zap,
  ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';

interface AIReferralStudioProps {
  letter: string;
  onChangeLetter: (val: string) => void;
  tone: LetterTone;
  onChangeTone: (tone: LetterTone) => void;
  onGenerate: (tone?: LetterTone) => Promise<void>;
  isGenerating: boolean;
  studentCount: number;
}

const TONES: { id: LetterTone; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'professional', label: 'Professional', desc: 'Authoritative, polished, corporate-ready', icon: Briefcase },
  { id: 'academic', label: 'Academic Endorsement', desc: 'Focuses on coursework, GPA, and scholastic rigor', icon: GraduationCap },
  { id: 'enthusiastic', label: 'High Energy', desc: 'Vibrant, highlighting ambition and fast learning', icon: Zap },
  { id: 'concise', label: 'Concise Bulleted', desc: 'Brief, punchy points for executive review', icon: ListOrdered },
];

export function AIReferralStudio({
  letter,
  onChangeLetter,
  tone,
  onChangeTone,
  onGenerate,
  isGenerating,
  studentCount,
}: AIReferralStudioProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const handleCopy = () => {
    if (!letter) return;
    navigator.clipboard.writeText(letter);
    setCopied(true);
    toast.success('Recommendation letter copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSingle = studentCount === 1;

  return (
    <div className="space-y-5">
      {/* Studio Header & Tone Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-base font-bold text-foreground">
              AI Recommendation Letter Studio
            </span>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
              {isSingle ? '🎯 Tailored Profile Match' : `👥 Unified Cohort (${studentCount} Students)`}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Synthesizes student skills, project experience, and academic standing with the job qualifications.
          </p>
        </div>

        {/* Generate / Regenerate CTA */}
        <Button
          type="button"
          onClick={() => onGenerate(tone)}
          disabled={isGenerating}
          size="default"
          className="gap-2 shadow-md bg-primary hover:bg-primary/90 text-xs sm:text-sm h-10 px-4 shrink-0 font-semibold"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating Draft...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              {letter ? 'Regenerate Draft' : 'Generate Recommendation'}
            </>
          )}
        </Button>
      </div>

      {/* Tone Chips */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recommendation Tone & Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TONES.map((t) => {
            const Icon = t.icon;
            const isSelected = tone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChangeTone(t.id);
                  if (letter) {
                    onGenerate(t.id);
                  }
                }}
                className={`p-3 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs font-medium'
                    : 'border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground bg-card'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.label}</span>
                </div>
                <div className="text-[11px] opacity-80 line-clamp-2 mt-1">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('edit')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Content
            </Button>
            <Button
              type="button"
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              Formatted Letter Preview
            </Button>
          </div>

          {letter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
          )}
        </div>

        {viewMode === 'edit' ? (
          <div className="relative">
            <Textarea
              placeholder={
                isGenerating
                  ? 'Generating tailored endorsement letter...'
                  : 'Click "Generate Recommendation" to create an AI-powered endorsement letter, or write your own message directly here.'
              }
              value={letter}
              onChange={(e) => onChangeLetter(e.target.value)}
              disabled={isGenerating}
              className="min-h-[340px] max-h-[460px] font-sans text-sm sm:text-base leading-relaxed p-4 focus-visible:ring-primary shadow-xs"
            />
            {letter && (
              <div className="text-xs text-muted-foreground text-right pt-1.5">
                {letter.split(/\s+/).filter(Boolean).length} words • {letter.length} characters
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[340px] max-h-[460px] overflow-y-auto p-6 rounded-lg border border-border bg-card text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans text-foreground shadow-xs">
            {letter || (
              <span className="text-muted-foreground italic">
                No letter content generated yet. Switch to Edit or click Generate.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-muted flex items-center gap-2.5">
        <FileText className="w-4 h-4 shrink-0 text-primary" />
        <span>
          This endorsement letter will be tied to each referred student&apos;s link and featured prominently for the hiring company.
        </span>
      </div>
    </div>
  );
}
