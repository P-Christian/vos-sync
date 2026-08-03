import { Metadata } from "next";
import { Suspense } from "react";
import {
  getBrowseCompanies,
  getIndustries,
  getCompanySizes,
  getTrustedCompanies
} from "@/modules/public/company-profile/services/company-profile.service";
import { CompaniesBrowseModule } from "@/modules/public/company-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Companies | VOS Sync",
  description: "Find verified employers hiring qualified professionals on VOS Sync. Explore industries, company sizes, and job vacancies.",
};

export default async function CompaniesPage() {
  // Fetch lists server side for initial render load speed
  const [browseResult, industries, sizes, trustedCompanies] = await Promise.all([
    getBrowseCompanies({}, { page: 1, limit: 10 }),
    getIndustries(),
    getCompanySizes(),
    getTrustedCompanies(20)
  ]);

  return (
    <div className="pt-16 min-h-screen bg-background">
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground animate-pulse font-sans">
          Loading browse page...
        </div>
      }>
        <CompaniesBrowseModule
          initialCompanies={browseResult.companies}
          initialTotal={browseResult.total}
          industries={industries}
          sizes={sizes}
          trustedCompanies={trustedCompanies}
        />
      </Suspense>
    </div>
  );
}
