"use client";

// src/modules/client/talent-search/components/SavedTalentPanel.tsx

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Bookmark, MapPin, AlertCircle, Trash2, Eye, Send, Search, X, StickyNote, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavedTalent } from "../types";
import { getInitials, getImageUrl } from "../utils/talentUtils";
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

function SavedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse space-y-3 rounded-xl border border-border bg-card/80 p-4">
          <div className="flex gap-3">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-1/2 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted/60" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 w-14 rounded-full bg-muted/80" />
            <div className="h-5 w-12 rounded-full bg-muted/80" />
          </div>
        </div>
      ))}
    </div>
  );
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
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    onFetch();
  }, [onFetch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.headline ?? "").toLowerCase().includes(q) ||
        (s.location ?? "").toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q))
    );
  }, [saved, query]);

  // Only show the full-page loader when there is nothing to show yet;
  // background refreshes keep the list visible.
  const initialLoading = loading && saved.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Saved Candidates</span>
          {saved.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {saved.length}
            </span>
          )}
        </div>

        {saved.length > 3 && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved by name, skill, note…"
              aria-label="Search saved candidates"
              className="h-9 rounded-lg bg-background pl-8 pr-8 text-xs max-md:text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {initialLoading && <SavedSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onFetch}
            className="h-7 shrink-0 gap-1.5 text-xs max-md:min-h-10"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && saved.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-14 text-center"
        >
          <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">No saved candidates yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Use the <strong className="font-semibold">Save</strong> button on any profile to shortlist candidates and
            come back to them here.
          </p>
        </motion.div>
      )}

      {saved.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No saved candidates match &ldquo;{query}&rdquo;.
        </div>
      )}

      {filtered.length > 0 && (
        <div className={cn("grid grid-cols-1 gap-3 transition-opacity xl:grid-cols-2", loading && "opacity-70")}>
          <AnimatePresence mode="popLayout">
            {filtered.map((s) => {
              const avatarSrc = getImageUrl(s.profile_image_url);
              const confirming = confirmId === s.talent_user_id;

              return (
                <motion.div
                  layout="position"
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-4",
                    "border-border bg-card/80 shadow-2xs backdrop-blur-sm",
                    "transition-colors hover:border-primary/40 hover:shadow-xs"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover shadow-2xs"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary shadow-2xs">
                        {getInitials(s.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onView(s.talent_user_id)}
                        className="block max-w-full truncate text-left text-sm font-semibold tracking-tight text-foreground hover:text-primary hover:underline"
                      >
                        {s.name}
                      </button>
                      {s.headline && <p className="truncate text-xs text-muted-foreground">{s.headline}</p>}
                      {s.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/80">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.skills.slice(0, 4).map((sk) => (
                        <span
                          key={sk}
                          className="rounded-full border border-border/80 bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {sk}
                        </span>
                      ))}
                      {s.skills.length > 4 && (
                        <span className="self-center text-xs text-muted-foreground/75">+{s.skills.length - 4}</span>
                      )}
                    </div>
                  )}

                  {s.notes && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs italic text-muted-foreground">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{s.notes}</span>
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-3">
                    {confirming ? (
                      <>
                        <span className="mr-auto text-xs text-muted-foreground">Remove from saved?</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmId(null)}
                          className="h-8 rounded-lg px-3 text-xs max-md:min-h-10"
                        >
                          Cancel
                        </Button>
                        <Button
                          id={`saved-remove-${s.talent_user_id}`}
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            onUnsave(s.talent_user_id);
                            setConfirmId(null);
                          }}
                          disabled={unsaving}
                          className="h-8 gap-1.5 rounded-lg px-3 text-xs max-md:min-h-10"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          id={`saved-view-${s.talent_user_id}`}
                          size="sm"
                          variant="outline"
                          onClick={() => onView(s.talent_user_id)}
                          className="h-8 gap-1.5 rounded-lg px-3 text-xs shadow-2xs max-md:min-h-10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          id={`saved-invite-${s.talent_user_id}`}
                          size="sm"
                          onClick={() => onInvite(s.talent_user_id, s.name)}
                          className="h-8 gap-1.5 rounded-lg px-3 text-xs shadow-2xs max-md:min-h-10"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Invite
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmId(s.talent_user_id)}
                          disabled={unsaving}
                          aria-label={`Remove ${s.name} from saved`}
                          title="Remove from saved"
                          className="ml-auto h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-md:size-10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}