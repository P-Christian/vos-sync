import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Users,
  Calendar,
  FileText,
  PlusCircle,
  LayoutDashboard,
  Building,
  Settings,
  Search,
  GraduationCap,
  MessageSquare,
  UserCircle,
  Bell,
  ShieldCheck,
  Workflow,
  School,
} from "lucide-react";

export type Portal = "client" | "freelancer" | "school-admin" | "admin";
export type EntityType = "freelancer" | "client" | "school-admin";

export interface SearchLink {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon */
  iconClass?: string;
  /** Small right-aligned hint, e.g. "G then D" */
  hint?: string;
  /** Extra words so cmdk can match on them */
  keywords?: string;
}

export interface PortalSearchConfig {
  barPlaceholder: string;
  inputPlaceholder: string;
  emptyText: string;
  quickActions: SearchLink[];
  pagesHeading: string;
  pages: SearchLink[];
  peopleHeading: string;
  /** Which entity types show up when the user types a name */
  peopleEntityTypes: EntityType[];
  /** Live data groups (need the matching API routes) */
  liveJobs: boolean;
  liveApplicants: boolean;
  /** Log a profile view when opening a freelancer profile */
  logProfileViews: boolean;
}

/**
 * NOTE: only the /vos-sync/client/* routes below are copied from your existing code.
 * Every route marked TODO(verify) is a guess — fix it to match your real routes.
 */
export const PORTAL_SEARCH_CONFIG: Record<Portal, PortalSearchConfig> = {
  client: {
    barPlaceholder: "Search candidates, jobs, or quick actions...",
    inputPlaceholder: "Type a candidate name, job title, or command...",
    emptyText: "No matching candidates, jobs, or pages found.",
    peopleHeading: "Talent Pool",
    peopleEntityTypes: ["freelancer"],
    liveJobs: true,
    liveApplicants: true,
    logProfileViews: true,
    quickActions: [
      {
        label: "Post a job",
        href: "/vos-sync/client/jobs",
        icon: PlusCircle,
        iconClass: "text-primary",
        hint: "Create new listing",
        keywords: "create new listing hiring",
      },
      {
        label: "Schedule interview",
        href: "/vos-sync/client/interviews",
        icon: Calendar,
        iconClass: "text-blue-500",
        hint: "Book candidate session",
        keywords: "book candidate session",
      },
    ],
    pagesHeading: "Client Portal Pages",
    pages: [
      { label: "Dashboard", href: "/vos-sync/client/dashboard", icon: LayoutDashboard, iconClass: "text-primary", hint: "G then D" },
      { label: "Manage Jobs", href: "/vos-sync/client/jobs", icon: Briefcase, iconClass: "text-blue-500", hint: "G then J" },
      { label: "Review All Applicants", href: "/vos-sync/client/applicants", icon: FileText, iconClass: "text-amber-500", keywords: "pipeline candidates" },
      { label: "Shortlisted Candidates", href: "/vos-sync/client/applicants?status=SHORTLISTED", icon: Users, iconClass: "text-emerald-500" },
      { label: "Talent Search Directory", href: "/vos-sync/client/talent-search", icon: Search, iconClass: "text-indigo-500" },
      { label: "Interview Calendar", href: "/vos-sync/client/interviews", icon: Calendar, iconClass: "text-muted-foreground", keywords: "schedule" },
      { label: "ATS Pipeline", href: "/vos-sync/client/ats-pipeline", icon: Workflow, iconClass: "text-muted-foreground", keywords: "stages configuration" },
      { label: "Company Profile", href: "/vos-sync/client/company-profile", icon: Building, iconClass: "text-muted-foreground" },
      { label: "Configuration & Team", href: "/vos-sync/client/settings", icon: Settings, iconClass: "text-muted-foreground", keywords: "team settings" },
    ],
  },

  freelancer: {
    barPlaceholder: "Search companies, schools, or quick actions...",
    inputPlaceholder: "Type a company, school, or command...",
    emptyText: "No matching profiles or pages found.",
    peopleHeading: "Companies & Schools",
    peopleEntityTypes: ["client", "school-admin"],
    liveJobs: false,
    liveApplicants: false,
    logProfileViews: false,
    quickActions: [
      // TODO(verify) all freelancer routes
      { label: "Browse jobs", href: "/vos-sync/freelancer/jobs", icon: Briefcase, iconClass: "text-blue-500", hint: "Find work", keywords: "find opportunities" },
      { label: "My applications", href: "/vos-sync/freelancer/applications", icon: FileText, iconClass: "text-amber-500", hint: "Track status" },
    ],
    pagesHeading: "Freelancer Pages",
    pages: [
      { label: "Dashboard", href: "/vos-sync/freelancer/dashboard", icon: LayoutDashboard, iconClass: "text-primary" },
      { label: "My Profile", href: "/vos-sync/freelancer/profile", icon: UserCircle, iconClass: "text-muted-foreground", keywords: "resume portfolio" },
      { label: "Interviews", href: "/vos-sync/freelancer/interviews", icon: Calendar, iconClass: "text-muted-foreground" },
      { label: "Messages", href: "/vos-sync/freelancer/messages", icon: MessageSquare, iconClass: "text-muted-foreground" },
      { label: "Notifications", href: "/vos-sync/freelancer/notifications", icon: Bell, iconClass: "text-muted-foreground" },
      { label: "Settings", href: "/vos-sync/freelancer/settings", icon: Settings, iconClass: "text-muted-foreground" },
    ],
  },

  "school-admin": {
    barPlaceholder: "Search students, companies, or quick actions...",
    inputPlaceholder: "Type a student, company, or command...",
    emptyText: "No matching students, companies, or pages found.",
    peopleHeading: "Students & Companies",
    peopleEntityTypes: ["freelancer", "client"],
    liveJobs: false,
    liveApplicants: false,
    logProfileViews: false,
    quickActions: [
      // TODO(verify) all school-admin routes
      { label: "View students", href: "/vos-sync/school-admin/students", icon: GraduationCap, iconClass: "text-emerald-500", hint: "Manage roster" },
      { label: "Partner companies", href: "/vos-sync/school-admin/partners", icon: Building, iconClass: "text-violet-500", hint: "Hiring partners" },
    ],
    pagesHeading: "School Portal Pages",
    pages: [
      { label: "Dashboard", href: "/vos-sync/school-admin/dashboard", icon: LayoutDashboard, iconClass: "text-primary" },
      { label: "School Profile", href: "/vos-sync/school-admin/school-profile", icon: School, iconClass: "text-muted-foreground" },
      { label: "Students", href: "/vos-sync/school-admin/students", icon: Users, iconClass: "text-emerald-500" },
      { label: "Messages", href: "/vos-sync/school-admin/messages", icon: MessageSquare, iconClass: "text-muted-foreground" },
      { label: "Notifications", href: "/vos-sync/school-admin/notifications", icon: Bell, iconClass: "text-muted-foreground" },
      { label: "Settings", href: "/vos-sync/school-admin/settings", icon: Settings, iconClass: "text-muted-foreground" },
    ],
  },

  admin: {
    barPlaceholder: "Search any user, company, school, or page...",
    inputPlaceholder: "Type a name, email, or command...",
    emptyText: "No matching accounts or pages found.",
    peopleHeading: "Accounts",
    peopleEntityTypes: ["freelancer", "client", "school-admin"],
    liveJobs: false,
    liveApplicants: false,
    logProfileViews: false,
    quickActions: [
      // TODO(verify) all admin routes
      { label: "Review verifications", href: "/vos-sync/admin/verifications", icon: ShieldCheck, iconClass: "text-emerald-500", hint: "Pending accounts" },
    ],
    pagesHeading: "Admin Pages",
    pages: [
      { label: "Dashboard", href: "/vos-sync/admin/dashboard", icon: LayoutDashboard, iconClass: "text-primary" },
      { label: "Users", href: "/vos-sync/admin/users", icon: Users, iconClass: "text-blue-500" },
      { label: "Companies", href: "/vos-sync/admin/companies", icon: Building, iconClass: "text-violet-500" },
      { label: "Schools", href: "/vos-sync/admin/schools", icon: GraduationCap, iconClass: "text-emerald-500" },
      { label: "Settings", href: "/vos-sync/admin/settings", icon: Settings, iconClass: "text-muted-foreground" },
    ],
  },
};

/**
 * Work out which portal we're in. Public profile pages live outside any portal
 * (/vos-sync/public/...) and carry ?portal=... so the sidebar stays consistent;
 * we honour that too.
 */
export function resolvePortal(pathname?: string | null, portalParam?: string | null): Portal {
  const p = pathname ?? "";
  if (p.startsWith("/vos-sync/client")) return "client";
  if (p.startsWith("/vos-sync/school-admin")) return "school-admin";
  if (p.startsWith("/vos-sync/admin")) return "admin";
  if (p.startsWith("/vos-sync/freelancer")) return "freelancer";

  if (portalParam === "client" || portalParam === "school-admin" || portalParam === "admin" || portalParam === "freelancer") {
    return portalParam;
  }
  return "freelancer";
}

export function publicProfileHref(portal: Portal, entityType: EntityType, userId: number): string {
  return `/vos-sync/public/${entityType}/${userId}?portal=${portal}`;
}
