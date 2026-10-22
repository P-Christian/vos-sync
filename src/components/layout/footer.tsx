"use client";

import Link from "next/link";
import { Briefcase, Facebook, Linkedin, Instagram, Twitter, Youtube } from "lucide-react";
import { SlideUp } from "@/components/shared/MotionContainer";
import { usePrimaryPlatformCompany } from "@/hooks/usePrimaryPlatformCompany";
import { useAuthSession } from "@/hooks/useAuthSession";

export function Footer() {
  const { company } = usePrimaryPlatformCompany();
  const session = useAuthSession();

  const brandDescription =
    company?.company_short_description ||
    company?.company_tagline ||
    "Connecting top talent with verified organizations. Your next career move starts here.";
  const legalName = company?.company_legal_name || company?.company_name || "VOS Sync";

  const socialLinks = [
    { name: "LinkedIn", href: company?.company_linkedin, icon: Linkedin },
    { name: "Facebook", href: company?.company_facebook, icon: Facebook },
    { name: "Instagram", href: company?.company_instagram, icon: Instagram },
    { name: "X", href: company?.company_x, icon: Twitter },
    { name: "YouTube", href: company?.company_youtube, icon: Youtube },
  ].filter((s) => Boolean(s.href));

  const candidateLinks = session.isJobSeeker
    ? [
        { label: "Find Jobs", href: "/vos-sync/freelancer/jobs" },
        { label: "My Applications", href: "/vos-sync/freelancer/applications" },
        { label: "Browse Companies", href: "/companies" },
        { label: "Career Advice", href: "/career-advice" },
      ]
    : [
        { label: "Find Jobs", href: "/find-jobs" },
        { label: "Browse Companies", href: "/companies" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Career Advice", href: "/career-advice" },
      ];

  const employerLinks = session.isEmployer
    ? [
        { label: "Post a Job", href: "/vos-sync/client/jobs" },
        { label: "Applicants", href: "/vos-sync/client/applicants" },
        { label: "Talent Search", href: "/vos-sync/client/talent-search" },
        { label: "Dashboard", href: "/vos-sync/client/dashboard" },
      ]
    : [
        { label: "Post a Job", href: "/signup?role=employer" },
        { label: "Hiring Solutions", href: "/how-it-works?role=employer" },
        { label: "Employer Sign In", href: "/login" },
      ];

  return (
    <footer className="relative z-10 bg-background/50 backdrop-blur-md border-t border-border/40 pt-16 pb-8">
      <SlideUp className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white dark:text-zinc-900" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">VOS Sync</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">
              {brandDescription}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Candidates</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {candidateLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Employers</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {employerLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/about-us" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/contact-us" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {legalName}. All rights reserved.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="w-8 h-8 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </SlideUp>
    </footer>
  );
}
export default Footer;
