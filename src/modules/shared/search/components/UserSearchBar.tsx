"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserSearch } from "../hooks/useUserSearch";

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

  const handleResultClick = async (userId: number) => {
    setIsOpen(false);
    setQuery("");
    
    // Log the profile view
    try {
      await fetch("/api/freelancer/profile-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewed_user_id: userId })
      });
    } catch (e) {
      console.error("Failed to log view", e);
    }
    
    // Determine which portal we are currently in so the sidebar stays consistent
    const isClientPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/vos-sync/client');
    const portalParam = isClientPortal ? "?portal=client" : "?portal=freelancer";

    // Navigate to public profile
    router.push(`/vos-sync/public/freelancer/${userId}${portalParam}`);
  };

  return (
    <div className="relative" ref={wrapperRef}>
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
          placeholder="Search freelancers..."
          className="h-9 w-48 sm:w-64 rounded-full border border-input bg-background/50 pl-9 pr-8 text-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <div className="max-h-[300px] overflow-y-auto py-2">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">Searching...</div>
            ) : error ? (
              <div className="px-4 py-3 text-sm text-red-500 text-center">{error}</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">No freelancers found.</div>
            ) : (
              <ul className="flex flex-col">
                {results.map((user) => (
                  <li key={user.user_id}>
                    <button
                      onClick={() => handleResultClick(user.user_id)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium leading-none">
                          {user.user_fname} {user.user_lname}
                        </span>
                        {user.headline && (
                          <span className="truncate text-xs text-muted-foreground mt-1">
                            {user.headline}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
