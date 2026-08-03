"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, SlidersHorizontal, Loader2, Check, Building2,  Briefcase, DollarSign, MessageSquare } from "lucide-react";
import { PublicCompanyProfile, TrustedCompany } from "./types";
import { TrustedEmployersMarquee } from "./components/TrustedEmployersMarquee";
import { CompanyBrowseCard } from "./components/CompanyBrowseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BrowseModuleProps {
  initialCompanies: PublicCompanyProfile[];
  initialTotal: number;
  industries: { industry_id: number; industry_name: string }[];
  sizes: { company_size_id: number; company_size_name: string }[];
  trustedCompanies: TrustedCompany[];
}

export default function CompaniesBrowseModule({
  initialCompanies,
  initialTotal,
  industries,
  sizes,
  trustedCompanies,
}: BrowseModuleProps) {
  // Search states
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("ALL");
  const [size, setSize] = useState("ALL");
  const [activeJobsOnly, setActiveJobsOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Loaded data state
  const [companies, setCompanies] = useState<PublicCompanyProfile[]>(initialCompanies);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  // Trigger AJAX data fetching
  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (location.trim()) params.append("location", location.trim());
      if (industry !== "ALL") params.append("industry", industry);
      if (size !== "ALL") params.append("size", size);
      if (activeJobsOnly) params.append("activeJobsOnly", "true");
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await fetch(`/api/public/companies?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCompanies(json.companies || []);
        setTotal(json.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch companies:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Run filters with delay or on trigger
  useEffect(() => {
    // Only skip fetching on first render if values are default
    const isDefault =
      search === "" &&
      location === "" &&
      industry === "ALL" &&
      size === "ALL" &&
      !activeJobsOnly &&
      page === 1;

    if (!isDefault) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, size, activeJobsOnly, page]);

  // Handle manual submit search triggers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCompanies();
  };

  const handleResetFilters = () => {
    setSearch("");
    setLocation("");
    setIndustry("ALL");
    setSize("ALL");
    setActiveJobsOnly(false);
    setPage(1);
    setCompanies(initialCompanies);
    setTotal(initialTotal);
  };

  return (
    <div className="w-full pb-20 font-sans">
      {/* 1. Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Get the full picture before you apply
        </h1>
        <p className="text-muted-foreground mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Learn about company culture, explore open roles, and discover what it&apos;s like to work there before making your next career move.
        </p>
      </div>

      {/* 2. Marquee section */}
      <div className="mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
            Trusted employers hiring on VOS Sync
          </p>
        </div>
        <TrustedEmployersMarquee companies={trustedCompanies} />
      </div>

      {/* 3. Research Experience Guide Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-border mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:sticky lg:top-24">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Explore companies with confidence
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base leading-relaxed">
              Get to know potential employers in one place — from their mission and workplace culture to open positions and employee insights.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* About Card */}
            <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">About</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Learn what the company does, what it stands for, where it&apos;s located, and the story behind its organization.
                </p>
              </div>
            </div>

            {/* Life & Culture Card */}
            <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
               
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Life & Culture</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Discover the company&apos;s values, workplace culture, benefits, and what they aim to offer their people.
                </p>
              </div>
            </div>

            {/* Open Jobs Card */}
            <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Open Jobs</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Explore current opportunities, compare roles, and find positions that match your skills, experience, and career goals.
                </p>
              </div>
            </div>

            {/* Salary Insights Card */}
            <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Salary Insights</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Get a better understanding of compensation expectations and make more informed career decisions.
                </p>
              </div>
            </div>

            {/* Employee Reviews Card */}
            <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex gap-4 sm:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Employee Reviews</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Hear from people with experience at the company and gain additional perspectives before you apply.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Browse Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Find a company that&apos;s right for you
            </h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Explore verified employers and discover opportunities that align with your career goals, values, and expectations.
            </p>
          </div>
          <div className="text-sm font-semibold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border select-none">
            Showing {companies.length} of {total} {total === 1 ? "Company" : "Companies"}
          </div>
        </div>

        {/* 2. Filters & Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 h-fit sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <span className="font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                Filters
              </span>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-6">
              {/* Search text */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Location filter */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                  City Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="e.g. Malolos..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Industry Select */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="ALL">All Industries</option>
                  {industries.map((ind) => (
                    <option key={ind.industry_id} value={ind.industry_id}>
                      {ind.industry_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size Select */}
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                  Company Size
                </label>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="ALL">All Sizes</option>
                  {sizes.map((s) => (
                    <option key={s.company_size_id} value={s.company_size_id}>
                      {s.company_size_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Jobs Only checkbox */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <label
                  htmlFor="activeJobsFilter"
                  className="text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer"
                >
                  Has Active Jobs Only
                </label>
                <button
                  type="button"
                  id="activeJobsFilter"
                  onClick={() => {
                    setActiveJobsOnly(!activeJobsOnly);
                    setPage(1);
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    activeJobsOnly
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input hover:border-zinc-400 bg-background"
                  }`}
                >
                  {activeJobsOnly && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </button>
              </div>

              <Button type="submit" className="w-full h-10 rounded-xl font-medium shadow-sm cursor-pointer">
                Apply Search
              </Button>
            </form>
          </div>

          {/* Results List */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm font-medium text-muted-foreground animate-pulse">
                  Querying verified employers...
                </span>
              </div>
            ) : companies.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed rounded-3xl py-20 px-4 bg-muted/10 text-center">
                <SlidersHorizontal className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-1">No employers found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  We couldn&apos;t find any companies matching your filter criteria. Try adjusting your settings.
                </p>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-6 rounded-xl font-semibold cursor-pointer"
                >
                  Reset all filters
                </Button>
              </div>
            ) : (
              <>
                {/* Company Browse Cards */}
                <div className="flex flex-col gap-6">
                  {companies.map((c) => (
                    <CompanyBrowseCard key={c.company_id} company={c} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-6 mt-4">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="rounded-xl font-medium cursor-pointer"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className="rounded-xl font-medium cursor-pointer"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
