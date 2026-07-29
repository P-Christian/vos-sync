import React from "react";
import { User, Mail, School, Phone, Globe, MapPin, BookOpen, GraduationCap } from "lucide-react";
import { PublicSchoolAdminProfile } from "../services/public-profile.service";

interface Props {
  profile: PublicSchoolAdminProfile;
}

export function PublicSchoolAdminProfileRender({ profile }: Props) {
  return (
    <div className="mx-auto w-full max-w-[85%] 2xl:max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        <div className="h-32 w-full bg-gradient-to-r from-emerald-500/30 via-teal-500/20 to-transparent"></div>
        <div className="px-8 pb-8 pt-0 flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 relative z-10">
          <div className="h-24 w-24 rounded-full border-4 border-background bg-muted flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            {profile.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.user_fname} {profile.user_lname}
            </h1>
            <p className="text-lg text-muted-foreground font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-500" />
              {profile.headline}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (School Details) */}
        <div className="md:col-span-2 space-y-8">
          {profile.school_name ? (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                {profile.school_logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.school_logo_url} alt="School Logo" className="h-16 w-16 rounded-xl border object-contain bg-white p-1" />
                ) : (
                  <div className="h-16 w-16 rounded-xl border bg-muted flex items-center justify-center text-muted-foreground">
                    <School className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{profile.school_name}</h2>
                  <p className="text-sm text-muted-foreground capitalize font-medium">{profile.school_type || "Educational Institution"}</p>
                </div>
              </div>

              {profile.school_description && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.school_description}
                </div>
              )}

              {/* School stats cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{profile.course_count || 0}</div>
                    <div className="text-xs text-muted-foreground font-medium">Courses Offered</div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2">
                <School className="h-5 w-5 text-primary" /> Institution Info
              </h2>
              <p className="text-muted-foreground italic text-sm">No school assigned to this admin yet.</p>
            </section>
          )}
        </div>

        {/* Right Column (Contact & Address Details) */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Contact Details</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{profile.user_email}</span>
              </div>

              {profile.school_email && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <School className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{profile.school_email}</span>
                </div>
              )}

              {profile.school_contact_no && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span>{profile.school_contact_no}</span>
                </div>
              )}

              {profile.school_website && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0 text-primary" />
                  <a 
                    href={profile.school_website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate hover:text-primary hover:underline transition-colors"
                  >
                    {profile.school_website.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </div>
              )}

              {profile.school_address && (
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span className="leading-relaxed">{profile.school_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
