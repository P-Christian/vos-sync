"use client";

import React from "react";
import { Mail, Phone, MapPin, Clock, MessageSquare, ArrowRight, LayoutDashboard, UserCheck, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { SlideUp, HoverScale, StaggerContainer, StaggerChild } from "@/components/shared/MotionContainer";
import { useAuthSession } from "@/hooks/useAuthSession";

// ==========================================
// MOCK DATA
// ==========================================

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email us",
    value: "hello@vossync.com",
    desc: "We reply within 24 hours.",
    href: "mailto:hello@vossync.com",
  },
  {
    icon: Phone,
    label: "Call us",
    value: "+63 900 000 0000",
    desc: "Mon–Fri, 9am–6pm PHT.",
    href: "tel:+639000000000",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Dagupan City, Philippines",
    desc: "Pangasinan",
    href: "https://www.google.com/maps/place/Vertex+Technologies+Corporation/@16.0811488,120.3628013,806m/data=!3m1!1e3!4m6!3m5!1s0x3391690070819183:0xa97974ead9f524e!8m2!3d16.082358!4d120.360837!16s%2Fg%2F11ms89t5n8?hl=en&entry=ttu",
  },
  {
    icon: Clock,
    label: "Support hours",
    value: "Mon–Fri, 9am–6pm",
    desc: "Philippine Time (PHT)",
    href: "#",
  },
];

const FAQS = [
  {
    q: "How quickly do you respond?",
    a: "Our team typically responds within one business day. For urgent matters, please call us directly.",
  },
  {
    q: "Can I post a job as a company?",
    a: "Yes! Reach out to our employer team or create a company account to start posting jobs immediately.",
  },
  {
    q: "Do you have a talent acquisition team?",
    a: "We work with recruiters and HR teams to source top-tier talent. Send us a message and we'll connect you.",
  },
];

// ==========================================
// COMPONENT
// ==========================================

export default function Contact() {
  const session = useAuthSession();

  return (
    <div className="text-foreground font-sans md:pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <StaggerContainer className="max-w-2xl">
            <StaggerChild>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase shadow-2xs mb-5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {session.isJobSeeker
                    ? "Job Seeker Support"
                    : session.isEmployer
                    ? "Employer Support"
                    : session.isAdmin || session.isSchool
                    ? "Organization Support"
                    : "Get in touch"}
                </span>
              </div>
            </StaggerChild>
            <StaggerChild>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
                Let&apos;s start a{" "}
                <span className="text-primary underline decoration-primary/30 underline-offset-8">
                  conversation.
                </span>
              </h1>
            </StaggerChild>
            <StaggerChild>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {session.isJobSeeker
                  ? "Signed in as Job Seeker. Have questions about job applications, profile verification, or scheduled interviews? We're here to assist."
                  : session.isEmployer
                  ? "Signed in as Employer. Need help with company verification, job postings, or talent search? Send us a message anytime."
                  : session.isAdmin || session.isSchool
                  ? "Signed in to your administrative account. Need help with platform operations, student records, or partner support? We're here for you."
                  : "Whether you're a job seeker, employer, or just have a question — we're here to help. Fill out the form and we'll get back to you soon."}
              </p>
            </StaggerChild>
          </StaggerContainer>
        </div>
      </section>

      {/* CONTACT INFO CARDS */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT_INFO.map((item) => (
              <StaggerChild key={item.label}>
                <HoverScale className="h-full">
                  <a
                    href={item.href}
                    onPointerMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                      e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                    }}
                    className="group/card relative overflow-hidden border border-border/80 rounded-2xl p-4 sm:p-6 bg-white/85 dark:bg-card/75 backdrop-blur-xl hover:border-primary/40 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_35px_rgba(37,99,235,0.14)] transition-all duration-300 block h-full"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
                      style={{
                        background:
                          "radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--info) / 0.12), transparent 60%)",
                      }}
                    />
                    <div className="relative z-10">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover/card:bg-primary group-hover/card:text-white transition-colors">
                        <item.icon className="w-5 h-5 text-primary group-hover/card:text-white transition-colors" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">{item.label}</p>
                      <p className="text-base font-semibold text-foreground mb-1">{item.value}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </a>
                </HoverScale>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FORM + FAQ */}
      <section className="py-16 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12 items-start">
            {/* FORM */}
            <SlideUp className="lg:col-span-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Send us a message</h2>
              <p className="text-muted-foreground mb-8 text-sm">We&apos;ll respond within one business day with next steps.</p>

              <div
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
                className="group/form relative overflow-hidden bg-white/85 dark:bg-card/75 border border-border/80 rounded-3xl p-5 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl space-y-5"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/form:opacity-100"
                  style={{
                    background:
                      "radial-gradient(500px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / 0.08), transparent 60%)",
                  }}
                />

                <div className="relative z-10 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name" className="text-sm font-medium text-foreground">Full name</Label>
                      <Input id="contact-name" placeholder="Your name" className="rounded-xl h-11 border-border/80 bg-white/70 dark:bg-card/60 backdrop-blur-md focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">Email</Label>
                      <Input id="contact-email" type="email" placeholder="you@company.com" className="rounded-xl h-11 border-border/80 bg-white/70 dark:bg-card/60 backdrop-blur-md focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="contact-company" className="text-sm font-medium text-foreground">Company</Label>
                      <Input id="contact-company" placeholder="Company / Organization" className="rounded-xl h-11 border-border/80 bg-white/70 dark:bg-card/60 backdrop-blur-md focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-subject" className="text-sm font-medium text-foreground">Subject</Label>
                      <Input id="contact-subject" placeholder="e.g. Hiring inquiry" className="rounded-xl h-11 border-border/80 bg-white/70 dark:bg-card/60 backdrop-blur-md focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message" className="text-sm font-medium text-foreground">Message</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="Tell us more about what you need..."
                      className="min-h-[140px] rounded-xl resize-none border-border/80 bg-white/70 dark:bg-card/60 backdrop-blur-md focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 transition-all"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                    <p className="text-xs text-muted-foreground">We respect your privacy. No spam, ever.</p>
                    <Button className="rounded-full px-7 shadow-sm hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white h-11 md:h-9">
                      Send message <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </SlideUp>

            {/* FAQ - Interactive Accordion */}
            <SlideUp className="lg:col-span-2" delay={0.2}>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Common questions</h2>
              <p className="text-muted-foreground mb-8 text-sm">Quick answers to things we get asked often.</p>
              
              <Accordion type="single" collapsible defaultValue="item-0" className="space-y-3">
                {FAQS.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border border-border/80 rounded-2xl px-5 bg-white/85 dark:bg-card/75 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:border-primary/40 transition-colors"
                  >
                    <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4 text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* DYNAMIC CTA STRIP */}
      <section className="py-14 md:py-20">
        <SlideUp className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/85 dark:bg-card/75 border border-border/80 rounded-3xl px-6 py-10 md:px-16 md:py-14 text-center relative overflow-hidden backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
            
            {session.isJobSeeker ? (
              /* Logged in Job Seeker View */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Ready to find your next opportunity?</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Browse thousands of open listings and track your job applications directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/vos-sync/freelancer" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Go to Job Seeker Portal
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/find-jobs" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Find Jobs
                    </Link>
                  </Button>
                </div>
              </div>
            ) : session.isEmployer ? (
              /* Logged in Employer View */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Looking to hire top talent?</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Manage your active job postings, review applicants, and source verified candidates.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/vos-sync/client/jobs" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Go to Client Portal
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/vos-sync/client/talent-search" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Find Talent
                    </Link>
                  </Button>
                </div>
              </div>
            ) : session.isAdmin || session.isSchool ? (
              /* Logged in Admin / School View */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Need administrative support?</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Access your management dashboard or reach out to our dedicated platform support team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href={session.dashboard || "/vos-sync/admin"} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/find-jobs">Browse Jobs</Link>
                  </Button>
                </div>
              </div>
            ) : (
              /* Guest / Unauthenticated View */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Ready to find your next opportunity?</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Explore thousands of jobs from top companies — no recruiter required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/signup">Create Free Account</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/find-jobs">Browse Jobs</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SlideUp>
      </section>
    </div>
  );
}


