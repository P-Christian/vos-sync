"use client";

import React from "react";
import {
  Briefcase, Globe, Users, TrendingUp,
  HeartHandshake, Shield, Zap, Star,
  ArrowRight, CheckCircle2, UserCheck, Building2, LayoutDashboard
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SlideUp, HoverScale, StaggerContainer, StaggerChild } from "@/components/shared/MotionContainer";
import { useAuthSession } from "@/hooks/useAuthSession";

// ==========================================
// MOCK DATA
// ==========================================

const STATS = [
  { value: "50K+", label: "Jobs Posted" },
  { value: "8,200+", label: "Companies" },
  { value: "42", label: "Countries" },
  { value: "6", label: "Years Running" },
];

const VALUES = [
  {
    icon: HeartHandshake,
    title: "People First",
    desc: "We put job seekers and employers at the center of every product decision we make.",
    color: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Shield,
    title: "Trust & Safety",
    desc: "Every listing is verified. We work hard to keep our platform free from scams and bad actors.",
    color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Zap,
    title: "Speed Matters",
    desc: "Hiring moves fast. Our platform is designed to match candidates and companies in days, not months.",
    color: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Star,
    title: "Quality over Quantity",
    desc: "We curate opportunities so that every listing on our platform is worth your time.",
    color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
  },
];

const MILESTONES = [
  { year: "2018", event: "Founded with a mission to make hiring more human." },
  { year: "2020", event: "Reached 1,000 active job listings and 10,000 registered candidates." },
  { year: "2022", event: "Expanded to Southeast Asia, opening talent pipelines across 8 countries." },
  { year: "2024", event: "Crossed 50,000 jobs posted with a 92% placement rate for verified roles." },
];

const TEAM_HIGHLIGHTS = [
  { icon: Globe, title: "Remote-first", desc: "Our team operates across 6 countries, practicing what we preach." },
  { icon: Users, title: "42 teammates", desc: "A lean, focused team of engineers, designers, and talent specialists." },
  { icon: TrendingUp, title: "Growing fast", desc: "We're doubling headcount in 2025 — and always hiring." },
  { icon: Briefcase, title: "10M+ applications", desc: "Over 10 million job applications processed through our platform." },
];

// ==========================================
// COMPONENT
// ==========================================

export default function AboutUs() {
  const session = useAuthSession();

  return (
    <div className="text-foreground font-sans md:pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <StaggerContainer>
            <StaggerChild>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase shadow-2xs mb-5">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Our Story</span>
              </div>
            </StaggerChild>
            <StaggerChild>
              <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
                We believe everyone deserves{" "}
                <span className="text-primary underline decoration-primary/30 underline-offset-8">
                  meaningful work.
                </span>
              </h1>
            </StaggerChild>
            <StaggerChild>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                VosSync was built to bridge the gap between ambitious professionals and the companies building tomorrow. We&apos;re not just a job board — we&apos;re a career partner.
              </p>
            </StaggerChild>
          </StaggerContainer>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border/60 py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {STATS.map((stat) => (
              <StaggerChild key={stat.label}>
                <p className="text-2xl md:text-5xl font-extrabold text-foreground tracking-tight mb-1">{stat.value}</p>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.label}</p>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <SlideUp>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Our Mission</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-tight">
                Connecting talent with opportunity at the speed of ambition.
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed mb-6">
                Traditional hiring is broken — slow processes, opaque requirements, and endless black holes. We built VosSync to make hiring transparent, fast, and human again.
              </p>
              <div className="space-y-3">
                {[
                  "Verified employers and authentic job listings",
                  "AI-assisted talent matching tailored to your skills",
                  "Transparent salary ranges on every listing",
                  "Direct communication with hiring managers",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{point}</span>
                  </div>
                ))}
              </div>
            </SlideUp>

            <SlideUp delay={0.2}>
              <div className="grid grid-cols-2 gap-4">
                {TEAM_HIGHLIGHTS.map((th) => (
                  <div
                    key={th.title}
                    className="border border-border/80 rounded-2xl p-4 sm:p-6 bg-white/85 dark:bg-card/75 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_30px_rgba(37,99,235,0.12)] hover:border-primary/40 transition-all duration-300"
                  >
                    <th.icon className="w-6 h-6 text-primary mb-3" />
                    <h3 className="text-sm font-bold text-foreground mb-1">{th.title}</h3>
                    <p className="text-sm md:text-xs text-muted-foreground leading-relaxed">{th.desc}</p>
                  </div>
                ))}
              </div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* CORE VALUES */}
      <section className="py-16 md:py-24 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Our Values</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">What guides our work</h2>
          </div>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {VALUES.map((val) => (
              <StaggerChild key={val.title}>
                <HoverScale className="h-full">
                  <div
                    onPointerMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                      e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                    }}
                    className="group/card relative overflow-hidden border border-border/80 rounded-2xl p-6 bg-white/85 dark:bg-card/75 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_35px_rgba(37,99,235,0.14)] hover:border-primary/40 transition-all duration-300 h-full flex flex-col justify-between"
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
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${val.color}`}>
                        <val.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-2 group-hover/card:text-primary transition-colors">{val.title}</h3>
                      <p className="text-base md:text-sm text-muted-foreground leading-relaxed">{val.desc}</p>
                    </div>
                  </div>
                </HoverScale>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-16 md:py-24 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 md:gap-16">
            <SlideUp className="lg:w-1/3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Timeline</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">How we got here</h2>
              <p className="text-muted-foreground leading-relaxed">
                VosSync didn&apos;t start as a billion-dollar idea. It started with a simple observation: job searching was painful, and it didn&apos;t have to be.
              </p>
            </SlideUp>

            <div className="lg:w-2/3">
              <StaggerContainer className="space-y-0">
                {MILESTONES.map((m, i) => (
                  <StaggerChild key={m.year}>
                    <div className="flex gap-6 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 z-10 shadow-xs">
                          {m.year.slice(2)}
                        </div>
                        {i < MILESTONES.length - 1 && (
                          <div className="w-px flex-1 bg-border/80 my-1" />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className="text-xs font-semibold text-primary mb-1">{m.year}</p>
                        <p className="text-foreground font-medium">{m.event}</p>
                      </div>
                    </div>
                  </StaggerChild>
                ))}
              </StaggerContainer>
            </div>
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
              /* Logged in Job Seeker */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Join us in building the future of work</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Browse verified opportunities and connect directly with top companies.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/vos-sync/freelancer" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Go to Job Seeker Portal
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/contact-us">Contact Support <ArrowRight className="ml-2 w-4 h-4" /></Link>
                  </Button>
                </div>
              </div>
            ) : session.isEmployer ? (
              /* Logged in Employer */
              <div className="relative z-10">
                 <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Join us in building the future of work</h2>
                <p className="text-slate-300 dark:text-slate-400 mb-8 max-w-xl mx-auto text-lg">
                  Scale your team with verified professionals and seamless hiring workflows.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/vos-sync/client/jobs" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Go to Client Portal
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/contact-us">Contact Us <ArrowRight className="ml-2 w-4 h-4" /></Link>
                  </Button>
                </div>
              </div>
            ) : session.isAdmin || session.isSchool ? (
              /* Logged in School / Admin */
              <div className="relative z-10">
                 <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Join us in building the future of work</h2>
                <p className="text-slate-300 dark:text-slate-400 mb-8 max-w-xl mx-auto text-lg">
                  Access your management tools, student records, and platform controls.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href={session.dashboard || "/vos-sync/admin"} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/contact-us">Contact Us <ArrowRight className="ml-2 w-4 h-4" /></Link>
                  </Button>
                </div>
              </div>
            ) : (
              /* Guest / Unauthenticated */
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Join us in building the future of work</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Whether you&apos;re hiring or being hired — VosSync is built for you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/signup">Get Started Free</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/contact-us">Contact Us <ArrowRight className="ml-2 w-4 h-4" /></Link>
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
