import { Compass,  Image as ImageIcon, Briefcase } from "lucide-react";
import { PublicCompanyProfile } from "../../types";
import { Badge } from "@/components/ui/badge";

interface LifeAndCultureTabProps {
  company: PublicCompanyProfile;
  workArrangements: string[];
}

export function LifeAndCultureTab({ company, workArrangements }: LifeAndCultureTabProps) {
  const {
    company_culture,
    company_mission,
    company_vision,
    company_benefits,
    company_tags,
  } = company;

  // Split tags
  const tagsList = company_tags
    ? company_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-8 font-sans">
      {/* Dynamic Hiring Status Banner */}
      {company.activeJobsCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800/50 border border-blue-100 dark:border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">We are hiring!</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Explore our active job openings and find your place on our team.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Work Arrangements Available
            </span>
            <div className="flex flex-wrap gap-1.5">
              {workArrangements.length > 0 ? (
                workArrangements.map((arrangement) => (
                  <Badge
                    key={arrangement}
                    variant="secondary"
                    className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full text-xs border-none"
                  >
                    {arrangement}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full text-xs">
                  Active Openings
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main layout narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Culture Overview */}
          {company_culture ? (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                
                Life at {company.company_name}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {company_culture}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              
                Life at {company.company_name}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed italic">
                No company culture narrative has been provided yet.
              </p>
            </div>
          )}

          {/* Mission & Vision (Secondary Layout) */}
          {(company_mission || company_vision) && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Mission & Vision
              </h2>

              <div className="space-y-6">
                {company_mission && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Our Mission
                    </h3>
                    <p className="text-foreground text-sm leading-relaxed">
                      {company_mission}
                    </p>
                  </div>
                )}

                {company_vision && (
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Our Vision
                    </h3>
                    <p className="text-foreground text-sm leading-relaxed">
                      {company_vision}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Perks and Gallery placeholders */}
        <div className="space-y-6">
          {/* Perks side card */}
          {company_benefits && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Perks & Benefits</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {company_benefits}
              </p>
            </div>
          )}

          {/* Coming soon gallery */}
          <div className="bg-card border border-border rounded-2xl p-6 text-center py-10">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground mb-1 text-sm">Company Gallery</h3>
            <p className="text-xs text-muted-foreground px-4 leading-relaxed">
              Photos, videos, and workplace stories from the team are coming soon.
            </p>
          </div>

          {/* Values Chips */}
          {tagsList.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Our Core Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-xl text-xs font-semibold px-2.5 py-0.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
