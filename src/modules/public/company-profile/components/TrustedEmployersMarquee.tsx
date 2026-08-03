import Link from "next/link";
import Image from "next/image";
import { TrustedCompany } from "../types";

interface MarqueeProps {
  companies: TrustedCompany[];
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

export function TrustedEmployersMarquee({ companies }: MarqueeProps) {
  if (!companies || companies.length === 0) {
    return (
      <div className="w-full py-8 text-center border border-dashed rounded-xl bg-muted/20">
        <p className="text-sm text-muted-foreground">Join hundreds of growing companies hiring on VOS Sync.</p>
      </div>
    );
  }

  // Ensure marquee has enough cards to scroll seamlessly by repeating if necessary
  const repeatCount = Math.ceil(20 / companies.length);
  const repeatedCompanies = Array(repeatCount).fill(companies).flat();
  const row1 = repeatedCompanies;
  const row2 = [...repeatedCompanies].reverse();

  return (
    <div className="w-full overflow-hidden py-10 bg-muted/10 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 text-center mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Companies Hiring Through VOS Sync
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
          From startups to enterprise organizations, employers use VOS Sync to connect with qualified professionals.
        </p>
      </div>

      {/* Marquee viewport container */}
      <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex flex-col gap-6 overflow-hidden">
        {/* Left & Right gradient edge fades */}
        <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Row 1: Scrolling LTR */}
        <div className="company-marquee-row flex w-max gap-6 overflow-hidden">
          <div className="company-marquee-track flex gap-6 animate-marquee-ltr focus-within:[animation-play-state:paused] hover:[animation-play-state:paused]">
            {row1.map((company, index) => (
              <Link
                key={`row1-${company.companyId}-${index}`}
                href={`/companies/${company.companyCode}`}
                className="company-marquee-item flex items-center gap-3.5 bg-card border border-border rounded-2xl py-3 px-5 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-64 select-none shrink-0 group focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center text-lg font-bold overflow-hidden border border-border shrink-0 transition-all duration-300">
                  {company.companyLogo ? (
                    <Image
                      src={company.companyLogo}
                      alt={company.companyName}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
                      {getInitials(company.companyName)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {company.companyName}
                    </span>
                    {company.verified && (
                      <span
                        className="text-xs text-blue-500 font-bold flex items-center justify-center shrink-0 cursor-default"
                        title="Verified Employer"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {company.industryName || "General Business"}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                    {company.activeJobs} active {company.activeJobs === 1 ? "job" : "jobs"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Row 2: Scrolling RTL */}
        <div className="company-marquee-row flex w-max gap-6 overflow-hidden">
          <div className="company-marquee-track flex gap-6 animate-marquee-rtl focus-within:[animation-play-state:paused] hover:[animation-play-state:paused]">
            {row2.map((company, index) => (
              <Link
                key={`row2-${company.companyId}-${index}`}
                href={`/companies/${company.companyCode}`}
                className="company-marquee-item flex items-center gap-3.5 bg-card border border-border rounded-2xl py-3 px-5 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-64 select-none shrink-0 group focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center text-lg font-bold overflow-hidden border border-border shrink-0 transition-all duration-300">
                  {company.companyLogo ? (
                    <Image
                      src={company.companyLogo}
                      alt={company.companyName}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      unoptimized
                    />
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
                      {getInitials(company.companyName)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {company.companyName}
                    </span>
                    {company.verified && (
                      <span
                        className="text-xs text-blue-500 font-bold flex items-center justify-center shrink-0 cursor-default"
                        title="Verified Employer"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {company.industryName || "General Business"}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                    {company.activeJobs} active {company.activeJobs === 1 ? "job" : "jobs"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
