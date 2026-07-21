import React from "react";
import { User, MapPin, Globe, Briefcase, Mail } from "lucide-react";
import { PublicFreelancerProfile } from "../services/public-profile.service";

interface Props {
  profile: PublicFreelancerProfile;
}

export function PublicProfileRender({ profile }: Props) {
  return (
    <div className="mx-auto w-full max-w-[85%] 2xl:max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        <div className="h-32 w-full bg-gradient-to-r from-primary/40 via-primary/20 to-primary/5"></div>
        <div className="px-8 pb-8 pt-0 flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 relative z-10">
          <div className="h-24 w-24 rounded-full border-4 border-background bg-muted flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.user_fname} {profile.user_lname}
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              {profile.headline || "Freelancer"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column (About & Skills) */}
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2">
              <User className="h-5 w-5 text-primary" /> About Me
            </h2>
            {profile.bio ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-sm">No bio provided.</p>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2">
              <Briefcase className="h-5 w-5 text-primary" /> Skills & Expertise
            </h2>
            {profile.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-sm">No skills listed.</p>
            )}
          </section>
        </div>

        {/* Right Column (Contact / Links) */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Details</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{profile.user_email}</span>
              </div>
              
              {profile.portfolio_url && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0 text-primary" />
                  <a 
                    href={profile.portfolio_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate hover:text-primary hover:underline transition-colors"
                  >
                    {new URL(profile.portfolio_url).hostname.replace('www.', '')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
