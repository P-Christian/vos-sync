"use client";

// src/modules/client/talent-search/components/SavedTalentPanel.tsx

import React, { useEffect } from "react";
import Image from "next/image";
import { Bookmark, MapPin, Loader2, AlertCircle, Trash2, Eye, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
        <Bookmark className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Saved Candidates
        </span>
        {saved.length > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">({saved.length})</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">Loading saved candidates…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && saved.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Bookmark className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No saved candidates yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Search for talent and click &ldquo;Save&rdquo; to add them here.
          </p>
        </motion.div>
      )}

      {!loading && saved.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence mode="popLayout">
            {saved.map((s) => {
              const avatarSrc = getImageUrl(s.profile_image_url);
              return (
                <motion.div
                  layout="position"
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border",
                    "border-border bg-card/80 backdrop-blur-sm shadow-2xs",
                    "hover:shadow-xs hover:border-primary/40 transition-colors"
                  )}
                >
                  {/* Avatar */}
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={s.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-xl object-cover border border-border shrink-0 shadow-2xs"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {getInitials(s.name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate tracking-tight">{s.name}</p>
                    {s.headline && (
                      <p className="text-xs text-muted-foreground truncate">{s.headline}</p>
                    )}
                    {s.location && (
                      <p className="text-xs text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {s.location}
                      </p>
                    )}
                    {s.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="px-1.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border/80"
                          >
                            {sk}
                          </span>
                        ))}
                        {s.skills.length > 3 && (
                          <span className="text-xs text-muted-foreground/75">+{s.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                    {s.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-1">
                        📝 {s.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        id={`saved-view-${s.talent_user_id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => onView(s.talent_user_id)}
                        className="h-7 px-2 rounded-lg text-xs max-md:size-10 max-md:p-0 shadow-2xs"
                        title="View profile"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        id={`saved-invite-${s.talent_user_id}`}
                        size="sm"
                        onClick={() => onInvite(s.talent_user_id, s.name)}
                        className="h-7 px-2 rounded-lg text-xs max-md:size-10 max-md:p-0 shadow-2xs"
                        title="Send invitation"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        id={`saved-remove-${s.talent_user_id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => onUnsave(s.talent_user_id)}
                        disabled={unsaving}
                        className="h-7 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive max-md:size-10 max-md:p-0 shadow-2xs"
                        title="Remove from saved"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </motion.div>
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
