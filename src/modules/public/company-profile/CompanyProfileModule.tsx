"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PublicCompanyProfile } from "./types";
import { CompanyHeader } from "./components/CompanyHeader";
import { CompanyTabNav } from "./components/CompanyTabNav";
import { AboutTab } from "./components/tabs/AboutTab";
import { LifeAndCultureTab } from "./components/tabs/LifeAndCultureTab";
import { JobsTab } from "./components/tabs/JobsTab";
import { SalariesTab } from "./components/tabs/SalariesTab";
import { ReviewsTab } from "./components/tabs/ReviewsTab";

interface ProfileModuleProps {
  company: PublicCompanyProfile;
}

export default function CompanyProfileModule({ company }: ProfileModuleProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab state synced with search param
  const [activeTab, setActiveTab] = useState("about");
  const [workArrangements, setWorkArrangements] = useState<string[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["about", "life", "jobs", "salaries", "reviews"].includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL query parameters cleanly
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tabId);
    router.replace(`/companies/${company.company_code}?${params.toString()}`);
  };

  return (
    <div className="w-full min-h-screen bg-background pb-24 font-sans select-none">
      {/* Dynamic Cover Header Banner */}
      <CompanyHeader company={company} onTabChange={handleTabChange} />

      {/* Sticky Tab Navigator */}
      <CompanyTabNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activeJobsCount={company.activeJobsCount}
      />

      {/* Main Tab Panels Display Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {activeTab === "about" && <AboutTab company={company} onTabChange={handleTabChange} />}
        {activeTab === "life" && (
          <LifeAndCultureTab company={company} workArrangements={workArrangements} />
        )}
        {activeTab === "jobs" && (
          <JobsTab company={company} onArrangementsChange={setWorkArrangements} />
        )}
        {activeTab === "salaries" && <SalariesTab />}
        {activeTab === "reviews" && <ReviewsTab company={company} />}
      </div>
    </div>
  );
}
