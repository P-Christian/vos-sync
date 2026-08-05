"use client";

// src/modules/client/talent-search/components/TalentCard.tsx

import React from "react";
import Image from "next/image";
import { MapPin, Briefcase, BookmarkPlus, BookmarkCheck,   Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TalentCard as TalentCardType } from "../types";
import { getInitials, matchScoreColor, formatExperienceYears, truncate, getImageUrl } from "../utils/talentUtils";

interface TalentCardProps {
  talent: TalentCardType;
  onViewProfile: (talent: TalentCardType) => void;
  onToggleSave: (talent: TalentCardType) => void;
  saving: boolean;
}

export default function TalentCardComponent({ talent, onViewProfile, onToggleSave, saving }: TalentCardProps) {
  const initials = getInitials(talent.name);
  const scoreClass = matchScoreColor(talent.match_score);
  const avatarSrc = getImageUrl(talent.profile_image_url);

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-zinc-200 dark:border-zinc-800",
        "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm",
        "hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700",
        "transition-all duration-200 p-5 flex flex-col gap-4",
        "hover:-translate-y-0.5"
      )}
    >
      {/* Match Score badge (Search mode only) */}
      {talent.match_score !== null && talent.match_score !== undefined && (
        <div className={cn("absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold border", scoreClass)}>
          <span className="flex items-center gap-1">
            {talent.match_score}% Match
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={talent.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
              unoptimized
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-base">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{talent.name}</h3>
          {talent.headline && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{talent.headline}</p>
          )}
          {talent.location && (
            <p className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {talent.location}
            </p>
          )}
        </div>
      </div>

      {/* Experience */}
      {(talent.experience_years > 0 || (talent.relevant_experience_years ?? 0) > 0) && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {formatExperienceYears(talent.relevant_experience_years ?? talent.experience_years)} relevant exp
          </span>
          {talent.experience_years > (talent.relevant_experience_years ?? talent.experience_years) && (
            <span className="text-zinc-400 text-[11px]">
              ({formatExperienceYears(talent.experience_years)} total)
            </span>
          )}
          {talent.work_experience[0] && (
            <span className="text-zinc-300 dark:text-zinc-600 mx-1">·</span>
          )}
          {talent.work_experience[0] && (
            <span className="truncate">
              {talent.work_experience[0].is_current_role ? "Currently at " : ""}
              {talent.work_experience[0].company_name}
            </span>
          )}
        </div>
      )}

      {/* Skills */}
      {talent.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {talent.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
            >
              {skill}
            </span>
          ))}
          {talent.skills.length > 5 && (
            <span className="px-2 py-0.5 rounded-full text-xs text-zinc-400">
              +{talent.skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      {talent.summary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
          {truncate(talent.summary, 140)}
        </p>
      )}

      {/* Availability badge */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span
          className={cn(
            "text-xs px-2.5 py-0.5 rounded-full font-medium border",
            talent.availability_status === "AVAILABLE" || talent.availability_status === "IMMEDIATELY_AVAILABLE"
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
          )}
        >
          {talent.availability_status === "AVAILABLE" || talent.availability_status === "IMMEDIATELY_AVAILABLE"
            ? "✓ Available"
            : "Employed"}
        </span>

        <div className="flex gap-1.5">
          {/* Save/unsave */}
          <Button
            id={`talent-save-${talent.user_id}`}
            variant="outline"
            size="sm"
            onClick={() => onToggleSave(talent)}
            disabled={saving}
            className={cn(
              "h-8 px-2.5 rounded-lg text-xs gap-1.5 transition-all",
              talent.is_saved
                ? "border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
            )}
          >
            {talent.is_saved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
            {talent.is_saved ? "Saved" : "Save"}
          </Button>

          {/* View Profile */}
          <Button
            id={`talent-view-${talent.user_id}`}
            size="sm"
            onClick={() => onViewProfile(talent)}
            className="h-8 px-3 rounded-lg text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-medium"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
