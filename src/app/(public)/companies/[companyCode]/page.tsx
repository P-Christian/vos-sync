import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublicCompanyByCode } from "@/modules/public/company-profile/services/company-profile.service";
import { CompanyProfileModule } from "@/modules/public/company-profile";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ companyCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyCode } = await params;
  const company = await getPublicCompanyByCode(companyCode);
  
  if (!company) {
    return {
      title: "Company Not Found | VOS Sync",
    };
  }

  return {
    title: `${company.company_name} Profile & Open Jobs | VOS Sync`,
    description: company.company_description
      ? `${company.company_description.slice(0, 150)}...`
      : `Learn more about working at ${company.company_name}. View active job listings and corporate information on VOS Sync.`,
  };
}

export default async function CompanyProfilePage({ params }: PageProps) {
  const { companyCode } = await params;
  const company = await getPublicCompanyByCode(companyCode);

  if (!company) {
    notFound();
  }

  return (
    <div className="pt-16 min-h-screen bg-background">
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground animate-pulse font-sans">
          Loading company profile...
        </div>
      }>
        <CompanyProfileModule company={company} />
      </Suspense>
    </div>
  );
}
