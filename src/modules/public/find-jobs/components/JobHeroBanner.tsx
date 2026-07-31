// src/modules/public/find-jobs/components/JobHeroBanner.tsx
"use client";

import React from "react";
import { Search, MapPin, Briefcase, Sparkles, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  searchQuery: string;
  locationQuery: string;
  onSearchChange: (q: string) => void;
  onLocationChange: (loc: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  totalJobs: number;
  onQuickCategoryClick: (cat: string) => void;
}

export function JobHeroBanner({
  searchQuery,
  locationQuery,
  onSearchChange,
  onLocationChange,
  onSearchSubmit,
  totalJobs,
  onQuickCategoryClick,
}: Props) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b pt-22 pb-16 px-4  sm:px-6 lg:px-8">
      {/* Decorative background glows */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-3xl opacity-50 pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase shadow-2xs">
          <span>Discover Your Next Career Opportunity</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          Explore <span className="text-primary underline decoration-primary/30 underline-offset-8">{totalJobs > 0 ? `${totalJobs}+` : "Top"} Open Jobs</span> Across the Philippines
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Connect directly with verified employers, remote opportunities, and career openings without hassle.
        </p>

        {/* Hero Search Bar Box */}
        <form
          onSubmit={onSearchSubmit}
          className="bg-card border rounded-2xl shadow-xl p-3 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 backdrop-blur-md"
        >
          {/* Keyword Search Input */}
          <div className="md:col-span-5 relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Job title, keyword, or company..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-12 bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary text-sm font-medium"
            />
          </div>

          {/* Location Input */}
          <div className="md:col-span-4 relative flex items-center border-t md:border-t-0 md:border-l pt-3 md:pt-0 pl-0 md:pl-3">
            <MapPin className="absolute left-3.5 md:left-6 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="City, province, or Remote..."
              value={locationQuery}
              onChange={(e) => onLocationChange(e.target.value)}
              className="pl-10 h-12 bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary text-sm font-medium"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-3">
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-sm font-bold gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Search className="h-4 w-4" />
              Search Jobs
            </Button>
          </div>
        </form>

        {/* Popular Quick Search Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Popular:</span>
          {["Remote", "Full Time", "Software Engineer", "Customer Service", "Virtual Assistant", "Graphic Designer"].map(
            (tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onQuickCategoryClick(tag)}
                className="px-3 py-1 rounded-lg border bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors text-[11px] font-medium"
              >
                {tag}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
