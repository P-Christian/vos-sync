"use client";

import React from "react";
import { Mail, Phone, MapPin, Clock, MessageSquare, ArrowRight, LayoutDashboard, UserCheck, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
    <div className="bg-background text-foreground font-sans pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-zinc-100 dark:from-zinc-900/40 via-white dark:via-zinc-950 to-white dark:to-zinc-950" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="max-w-2xl">
            <StaggerChild>
              <Badge variant="secondary" className="mb-5 py-1.5 px-4 rounded-full shadow-sm bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm text-sm border-zinc-200 dark:border-zinc-800">
                <MessageSquare className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                {session.isJobSeeker
                  ? "Job Seeker Support"
                  : session.isEmployer
                  ? "Employer Support"
                  : session.isAdmin || session.isSchool
                  ? "Organization Support"
                  : "Get in touch"}
              </Badge>
            </StaggerChild>
            <StaggerChild>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-tight">
                Let&apos;s start a{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 dark:from-zinc-400 to-zinc-900 dark:to-zinc-100">
                  conversation.
                </span>
              </h1>
            </StaggerChild>
            <StaggerChild>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
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
                    className="group border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 block h-full"
                  >
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 transition-colors">
                      <item.icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">{item.label}</p>
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{item.value}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</p>
                  </a>
                </HoverScale>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FORM + FAQ */}
      <section className="py-16 bg-zinc-50 dark:bg-zinc-900/20 border-y border-zinc-100 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            {/* FORM */}
            <SlideUp className="lg:col-span-3">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Send us a message</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">We&apos;ll respond within one business day with next steps.</p>

              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full name</Label>
                    <Input id="contact-name" placeholder="Your name" className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</Label>
                    <Input id="contact-email" type="email" placeholder="you@company.com" className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="contact-company" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Company</Label>
                    <Input id="contact-company" placeholder="Company / Organization" className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-subject" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject</Label>
                    <Input id="contact-subject" placeholder="e.g. Hiring inquiry" className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Tell us more about what you need..."
                    className="min-h-[140px] rounded-xl resize-none border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <p className="text-xs text-zinc-400">We respect your privacy. No spam, ever.</p>
                  <Button className="rounded-full px-7 shadow-sm hover:shadow-md transition-all cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                    Send message <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </SlideUp>

            {/* FAQ */}
            <SlideUp className="lg:col-span-2" delay={0.2}>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Common questions</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">Quick answers to things we get asked often.</p>
              <div className="space-y-4">
                {FAQS.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{faq.q}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* DYNAMIC CTA STRIP */}
      <section className="py-20">
        <SlideUp className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 dark:bg-zinc-950 dark:border dark:border-zinc-800/80 rounded-3xl px-8 py-14 md:px-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 dark:bg-zinc-900 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-800 dark:bg-zinc-900 rounded-full blur-3xl -ml-20 -mb-20" />
            
            {session.isJobSeeker ? (
              /* Logged in Job Seeker View */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Ready to find your next opportunity?</h2>
                <p className="text-zinc-400 dark:text-zinc-500 mb-8 max-w-xl mx-auto text-lg">
                  Browse thousands of open listings and track your job applications directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                    <Link href="/vos-sync/freelancer" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Go to Job Seeker Portal
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-zinc-700 dark:border-zinc-800 text-white bg-transparent hover:bg-zinc-800 dark:hover:bg-zinc-900/60 hover:text-white rounded-full px-8 cursor-pointer">
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
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Looking to hire top talent?</h2>
                <p className="text-zinc-400 dark:text-zinc-500 mb-8 max-w-xl mx-auto text-lg">
                  Manage your active job postings, review applicants, and source verified candidates.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                    <Link href="/vos-sync/client/manage-jobs" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Go to Client Portal
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-zinc-700 dark:border-zinc-800 text-white bg-transparent hover:bg-zinc-800 dark:hover:bg-zinc-900/60 hover:text-white rounded-full px-8 cursor-pointer">
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
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Need administrative support?</h2>
                <p className="text-zinc-400 dark:text-zinc-500 mb-8 max-w-xl mx-auto text-lg">
                  Access your management dashboard or reach out to our dedicated platform support team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                    <Link href={session.dashboard || "/vos-sync/admin"} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-zinc-700 dark:border-zinc-800 text-white bg-transparent hover:bg-zinc-800 dark:hover:bg-zinc-900/60 hover:text-white rounded-full px-8 cursor-pointer">
                    <Link href="/find-jobs">Browse Jobs</Link>
                  </Button>
                </div>
              </div>
            ) : (
              /* Guest / Unauthenticated View */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Ready to find your next opportunity?</h2>
                <p className="text-zinc-400 dark:text-zinc-500 mb-8 max-w-xl mx-auto text-lg">
                  Explore thousands of jobs from top companies — no recruiter required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                    <Link href="/signup">Create Free Account</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-zinc-700 dark:border-zinc-800 text-white bg-transparent hover:bg-zinc-800 dark:hover:bg-zinc-900/60 hover:text-white rounded-full px-8 cursor-pointer">
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


