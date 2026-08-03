"use client";

// src/modules/client/talent-search/components/SavedTalentPanel.tsx

import React, { useEffect } from "react";
import Image from "next/image";
import { Bookmark, MapPin, Loader2, AlertCircle, Trash2, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedTalent } from "../types";
import { getInitials } from "../utils/talentUtils";
import { cn } from "@/lib/utils";

interface SavedTalentPanelProps {
  saved: SavedTalent[];
  loading: boolean;
  error: string;
  onFetch: () => void;
  onView: (userId: number) => void;
  onUnsave: (userId: number) => void;
  onInvite: (userId: number, name: string) => void;
  unsaving: boolean;
}

export default function SavedTalentPanel({
  saved,
  loading,
  error,
  onFetch,
  onView,
  onUnsave,
  onInvite,
  unsaving,
}: SavedTalentPanelProps) {
  useEffect(() => {
    onFetch();
  }, [onFetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Saved Candidates
        </span>
        {saved.length > 0 && (
          <span className="ml-1 text-xs text-zinc-400">({saved.length})</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-6 justify-center text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading saved candidates…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && saved.length === 0 && (
        <div className="text-center py-12">
          <Bookmark className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No saved candidates yet.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Search for talent and click &ldquo;Save&rdquo; to add them here.
          </p>
        </div>
      )}

      {!loading && saved.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {saved.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border",
                "border-zinc-200 dark:border-zinc-800",
                "bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm",
                "hover:shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
              )}
            >
              {/* Avatar */}
              {s.profile_image_url ? (
                <Image
                  src={s.profile_image_url}
                  alt={s.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getInitials(s.name)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{s.name}</p>
                {s.headline && (
                  <p className="text-xs text-zinc-500 truncate">{s.headline}</p>
                )}
                {s.location && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {s.location}
                  </p>
                )}
                {s.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.skills.slice(0, 3).map((sk) => (
                      <span
                        key={sk}
                        className="px-1.5 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700"
                      >
                        {sk}
                      </span>
                    ))}
                    {s.skills.length > 3 && (
                      <span className="text-xs text-zinc-400">+{s.skills.length - 3}</span>
                    )}
                  </div>
                )}
                {s.notes && (
                  <p className="text-xs text-zinc-400 mt-1.5 italic line-clamp-1">
                    📝 {s.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  id={`saved-view-${s.talent_user_id}`}
                  size="sm"
                  variant="outline"
                  onClick={() => onView(s.talent_user_id)}
                  className="h-7 px-2 rounded-lg text-xs"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  id={`saved-invite-${s.talent_user_id}`}
                  size="sm"
                  onClick={() => onInvite(s.talent_user_id, s.name)}
                  className="h-7 px-2 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                >
                  <Send className="h-3 w-3" />
                </Button>
                <Button
                  id={`saved-remove-${s.talent_user_id}`}
                  size="sm"
                  variant="outline"
                  onClick={() => onUnsave(s.talent_user_id)}
                  disabled={unsaving}
                  className="h-7 px-2 rounded-lg text-xs text-rose-500 hover:border-rose-300 hover:text-rose-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
