import Link from "next/link";
import Image from "next/image";
import { MapPin, Briefcase } from "lucide-react";
import { PublicCompanyProfile } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BrowseCardProps {
  company: PublicCompanyProfile;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CompanyBrowseCard({ company }: BrowseCardProps) {
  const {
    company_name,
    company_code,
    industry_name,
    company_size_name,
    company_logo,
    company_description,
    company_address,
    verification_status,
    activeJobsCount,
  } = company;

  const verified = verification_status === "VERIFIED";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col md:flex-row gap-6 items-start">
      {/* Brand logo container */}
      <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden relative">
        {company_logo ? (
          <Image
            src={company_logo}
            alt={company_name}
            width={64}
            height={64}
            className="object-cover w-full h-full"
            loading="lazy"
            unoptimized
          />
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400">
            {getInitials(company_name)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 w-full flex flex-col justify-between h-full">
        <div>
          {/* Company Title Header */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-xl font-bold text-foreground hover:text-primary transition-colors">
              <Link href={`/companies/${company_code}`}>{company_name}</Link>
            </h3>
            {verified && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full text-[10px] border-none select-none">
                ✓ Verified Employer
              </Badge>
            )}
          </div>

          {/* Subheaders details */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3 font-medium">
            <span>{industry_name || "General Business"}</span>
            <span>•</span>
            <span>{company_size_name || "Unknown size"}</span>
            {company_address && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 max-w-[200px] md:max-w-xs truncate">
                  <MapPin className="w-3.5 h-3.5" />
                  {company_address.split(",")[0]}
                </span>
              </>
            )}
          </div>

          {/* Short description */}
          {company_description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {company_description}
            </p>
          )}
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span>
              {activeJobsCount} Active {activeJobsCount === 1 ? "Opening" : "Openings"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl font-medium" asChild>
              <Link href={`/companies/${company_code}`}>View Profile</Link>
            </Button>
            
            {activeJobsCount > 0 ? (
              <Button size="sm" className="rounded-xl font-medium cursor-pointer shadow-sm" asChild>
                <Link href={`/companies/${company_code}?tab=jobs`}>
                  View {activeJobsCount} Open Jobs
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="rounded-xl font-medium opacity-60 cursor-not-allowed" disabled>
                No Open Positions
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
