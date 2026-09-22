/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  Globe,
  Facebook,
  Linkedin,
  BookOpen,
  Building2,
  ExternalLink,
  Target,
  Sparkles,
  Info,
  GraduationCap as CourseIcon,
} from "lucide-react";
import { PublicSchoolAdminProfile } from "../services/public-profile.service";

interface Props {
  profile: PublicSchoolAdminProfile;
}

function sanitizeWebsiteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 truncate"
          >
            <span className="truncate">{value}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

export function PublicSchoolAdminProfileRender({ profile }: Props) {
  const schoolName = profile.school_name || `${profile.user_fname} ${profile.user_lname}`;
  const schoolType = profile.school_type || "University";
  const coverUrl = profile.school_cover;
  const logoUrl = profile.school_logo_url || profile.avatar_url;
  const address = profile.school_address;

  const website = sanitizeWebsiteUrl(profile.school_website);
  const facebook = sanitizeWebsiteUrl(profile.social_links?.facebook);
  const linkedin = sanitizeWebsiteUrl(profile.social_links?.linkedin);

  const courses = profile.courses || [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Cover + Logo Header Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Hero Cover Banner */}
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={schoolName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-r from-primary/20 via-primary/10 to-muted">
              <Building2 className="w-12 h-12 text-primary/40 mb-2" />
              <span className="text-xs font-semibold text-muted-foreground">Public Campus View</span>
            </div>
          )}

          <div className="absolute top-4 right-4 z-20">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0 text-xs font-semibold">
              Public Profile
            </Badge>
          </div>
        </div>

        {/* Profile Card Header Content */}
        <div className="px-6 pb-6 pt-0 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-background bg-card shadow-md flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={schoolName}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <GraduationCap className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[10px] px-2 py-0">
                {schoolType}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
              {schoolName}
            </h1>
            {address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{address}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="about" className="w-full space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="about" className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold">
            <Info className="h-3.5 w-3.5" />
            About
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" />
            Courses
            {courses.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-bold">
                {courses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: About */}
        <TabsContent value="about" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column (About, Mission & Values) */}
            <div className="md:col-span-2 space-y-6">
              {/* About */}
              <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  About the Institution
                </h2>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {profile.school_description ||
                    "This educational institution has not provided an overview description yet."}
                </p>
              </div>

              {/* Mission & Values */}
              {(profile.school_mission || profile.school_values) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.school_mission && (
                    <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Target className="w-3.5 h-3.5" />
                        <span>Mission</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {profile.school_mission}
                      </p>
                    </div>
                  )}

                  {profile.school_values && (
                    <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Core Values</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {profile.school_values}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column (Contact & Channels) */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                  Contact & Official Channels
                </h3>
                <div className="space-y-3">
                  <InfoRow
                    icon={Mail}
                    label="Official Email"
                    value={profile.school_email || profile.user_email}
                    href={`mailto:${profile.school_email || profile.user_email}`}
                  />
                  {profile.school_contact_no && (
                    <InfoRow
                      icon={Phone}
                      label="Contact Phone"
                      value={profile.school_contact_no}
                      href={`tel:${profile.school_contact_no}`}
                    />
                  )}
                  {website && (
                    <InfoRow
                      icon={Globe}
                      label="Official Website"
                      value={profile.school_website?.replace(/^https?:\/\/(www\.)?/, "")}
                      href={website}
                    />
                  )}
                  {facebook && (
                    <InfoRow
                      icon={Facebook}
                      label="Facebook"
                      value="Facebook Page"
                      href={facebook}
                    />
                  )}
                  {linkedin && (
                    <InfoRow
                      icon={Linkedin}
                      label="LinkedIn"
                      value="LinkedIn Profile"
                      href={linkedin}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab Content: Courses */}
        <TabsContent value="courses" className="space-y-6 mt-0">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Available Courses</h2>
                <p className="text-xs text-muted-foreground">Academic degree and certificate programs offered</p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {courses.length} {courses.length === 1 ? "Program" : "Programs"}
              </Badge>
            </div>

            {courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {courses.map((course) => (
                  <div
                    key={course.school_course_id}
                    className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors flex items-start gap-3"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <CourseIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-bold text-foreground leading-snug break-words">
                        {course.course_name}
                      </p>
                      {course.course_code && (
                        <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0">
                          {course.course_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">No active courses listed for this institution yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
