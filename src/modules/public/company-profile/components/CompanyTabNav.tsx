"use client";

import { cn } from "@/lib/utils";

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeJobsCount: number;
}

export function CompanyTabNav({ activeTab, onTabChange, activeJobsCount }: TabNavProps) {
  const tabs = [
    { id: "about", label: "About" },
    { id: "life", label: "Life & Culture" },
    {
      id: "jobs",
      label: "Jobs",
      badge: activeJobsCount > 0 ? activeJobsCount : undefined,
    },
    { id: "salaries", label: "Salaries" },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-md border-b border-border shadow-sm font-sans w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8 overflow-x-auto scrollbar-none py-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative py-4 px-1 text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer focus:outline-none",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold rounded-full select-none transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
