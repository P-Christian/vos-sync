"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, User, Building2, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserSearch } from "../hooks/useUserSearch";
import { Badge } from "@/components/ui/badge";

export function UserSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { results, isLoading, error } = useUserSearch(query);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = async (userId: number, entityType: "freelancer" | "client" | "school-admin") => {
    setIsOpen(false);
    setQuery("");

    // Log the profile view (only for freelancer profiles)
    if (entityType === "freelancer") {
      try {
        await fetch("/api/freelancer/profile-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewed_user_id: userId }),
        });
      } catch (e) {
        console.error("Failed to log view", e);
      }
    }

    // Determine which portal we are currently in so the sidebar stays consistent
    const isClientPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/vos-sync/client");
    const isSchoolPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/vos-sync/school-admin");
    let portalParam = "?portal=freelancer";
    if (isClientPortal) {
      portalParam = "?portal=client";
    } else if (isSchoolPortal) {
      portalParam = "?portal=school-admin";
    }

    // Navigate to public profile
    router.push(`/vos-sync/public/${entityType}/${userId}${portalParam}`);
  };

  const getEntityIcon = (type: "freelancer" | "client" | "school-admin", avatarUrl?: string) => {
    if (avatarUrl) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl} alt="Logo" className="h-full w-full rounded-full object-cover" />
      );
    }
    if (type === "client") {
      return <Building2 className="h-4 w-4" />;
    }
    if (type === "school-admin") {
      return <GraduationCap className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  const getEntityStyles = (type: "freelancer" | "client" | "school-admin") => {
    switch (type) {
      case "client":
        return {
          iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
        };
      case "school-admin":
        return {
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      default:
        return {
          iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search profiles, companies, schools..."
          className="h-9 w-full rounded-full border border-input bg-background/50 pl-9 pr-8 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-background"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-border bg-background shadow-lg z-50">
          <div className="max-h-[340px] overflow-y-auto py-2">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">Searching profiles...</div>
            ) : error ? (
              <div className="px-4 py-3 text-sm text-red-500 text-center">{error}</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">No matching profiles found.</div>
            ) : (
              <ul className="flex flex-col divide-y divide-border/40">
                {results.map((item, index) => {
                  const styles = getEntityStyles(item.entity_type);
                  return (
                    <li key={`${item.entity_type}-${item.user_id}-${index}`}>
                      <button
                        onClick={() => handleResultClick(item.user_id, item.entity_type)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden ${
                              item.avatar_url ? "bg-muted" : styles.iconBg
                            }`}
                          >
                            {getEntityIcon(item.entity_type, item.avatar_url)}
                          </div>
                          <div className="flex flex-col min-w-0 overflow-hidden">
                            <span className="truncate text-sm font-semibold text-foreground leading-tight">
                              {item.name}
                            </span>
                            {item.headline && (
                              <span className="truncate text-xs text-muted-foreground mt-0.5">
                                {item.headline}
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 font-medium px-2 py-0.5 ${styles.badge}`}
                        >
                          {item.badge_label}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

