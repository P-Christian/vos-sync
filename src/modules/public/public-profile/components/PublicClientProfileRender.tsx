import React from "react";
import { User, Mail, Shield, Globe, Phone, MapPin, ExternalLink } from "lucide-react";
import { PublicClientProfile } from "../services/public-profile.service";

interface Props {
  profile: PublicClientProfile;
}

export function PublicClientProfileRender({ profile }: Props) {
  const comp = profile.company;
  const name = comp?.company_name || `${profile.user_fname} ${profile.user_lname}`;
  const avatar = comp?.company_logo || profile.avatar_url;
  const headline = comp?.company_name ? "Client Partner" : profile.headline;

  return (
    <div className="mx-auto w-full max-w-[85%] 2xl:max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        <div className="h-32 w-full bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-transparent"></div>
        <div className="px-8 pb-8 pt-0 flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 relative z-10">
          <div className="h-24 w-24 rounded-full border-4 border-background bg-muted flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {name}
            </h1>
            <p className="text-lg text-muted-foreground font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              {headline}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (Details) */}
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2">
              <User className="h-5 w-5 text-primary" /> Profile Overview
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {comp?.company_description || "This is a client profile on VOS Sync. Clients can post jobs, search for freelancers, and manage project contracts."}
            </div>
          </section>
        </div>

        {/* Right Column (Contact Details) */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Contact Details</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{comp?.company_email || profile.user_email}</span>
              </div>

              {comp?.company_contact && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{comp.company_contact}</span>
                </div>
              )}

              {comp?.company_website && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={comp.company_website.startsWith("http") ? comp.company_website : `https://${comp.company_website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-primary hover:underline transition-colors flex items-center gap-1"
                  >
                    Website <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {comp?.company_address && (
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span className="leading-relaxed">{comp.company_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
