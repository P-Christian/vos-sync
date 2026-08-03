import {
  Briefcase, Globe, Users, TrendingUp,
  HeartHandshake, Shield, Zap, Star,
  ArrowRight, CheckCircle2
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideUp, HoverScale, StaggerContainer, StaggerChild } from "@/components/shared/MotionContainer";
import { cn } from "@/lib/utils";

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
    className: "bg-primary/10 text-primary",
  },
  {
    icon: Shield,
    title: "Trust & Safety",
    desc: "Every listing is verified. We work hard to keep our platform free from scams and bad actors.",
    className: "bg-secondary text-secondary-foreground",
  },
  {
    icon: Zap,
    title: "Speed Matters",
    desc: "Hiring moves fast. Our platform is designed to match candidates and companies in days, not months.",
    className: "bg-accent text-accent-foreground",
  },
  {
    icon: Star,
    title: "Quality over Quantity",
    desc: "We curate opportunities so that every listing on our platform is worth your time.",
    className: "bg-muted text-foreground",
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
  return (
    <div className="bg-background text-foreground font-sans pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted via-background to-background" />
        <div className="absolute top-0 right-0 -z-10 translate-x-1/3 -translate-y-1/4 opacity-30">
          <div className="w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl mix-blend-multiply" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <StaggerContainer>
            <StaggerChild>
              <Badge variant="secondary" className="mb-5 py-1.5 px-4 rounded-full shadow-sm bg-background/80 backdrop-blur-sm text-sm text-foreground">
                <HeartHandshake className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                Our Story
              </Badge>
            </StaggerChild>
            <StaggerChild>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
                We believe everyone deserves{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  meaningful work.
                </span>
              </h1>
            </StaggerChild>
            <StaggerChild>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                VosSync was built to bridge the gap between ambitious professionals and the companies building tomorrow. We&apos;re not just a job board — we&apos;re a career partner.
              </p>
            </StaggerChild>
          </StaggerContainer>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <StaggerChild key={stat.label}>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </div>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <SlideUp className="lg:w-1/2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Our Mission</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">
                To make job searching{" "}
                <span className="text-muted-foreground">faster, fairer, and more human.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Traditional job platforms are broken — riddled with ghost listings, impossible ATS systems, and one-size-fits-all applications. We built VosSync to fix that.
              </p>
              <div className="space-y-4">
                {[
                  "Real-time job listings verified by our team",
                  "Smart matching powered by skills, not just keywords",
                  "One-click applications that respect your time",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </SlideUp>

            <StaggerContainer className="lg:w-1/2 grid grid-cols-2 gap-4">
              {TEAM_HIGHLIGHTS.map((item) => (
                <StaggerChild key={item.title}>
                  <HoverScale className="h-full">
                    <div className="border border-border rounded-2xl p-6 bg-card text-card-foreground hover:shadow-md transition-all duration-200 hover:border-primary/40 h-full">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </HoverScale>
                </StaggerChild>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Our Values</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">What we stand for</h2>
            <p className="text-muted-foreground">
              These aren&apos;t just words on a wall. They&apos;re the principles that guide every feature we build.
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((val) => (
              <StaggerChild key={val.title}>
                <HoverScale className="h-full">
                  <div className="group border border-border rounded-2xl p-6 bg-card text-card-foreground hover:shadow-md hover:border-primary/40 transition-all duration-200 h-full">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", val.className)}>
                      <val.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">{val.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{val.desc}</p>
                  </div>
                </HoverScale>
              </StaggerChild>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16">
            <SlideUp className="lg:w-1/3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Timeline</p>
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
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 z-10">
                          {m.year.slice(2)}
                        </div>
                        {i < MILESTONES.length - 1 && (
                          <div className="w-px flex-1 bg-border my-1" />
                        )}
                      </div>
                      <div className={`pb-8 ${i < MILESTONES.length - 1 ? "" : ""}`}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{m.year}</p>
                        <p className="text-foreground/80 font-medium">{m.event}</p>
                      </div>
                    </div>
                  </StaggerChild>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <SlideUp className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl px-8 py-14 md:px-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl -ml-20 -mb-20" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight mb-4">Join us in building the future of work</h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto text-lg">
                Whether you&apos;re hiring or being hired — VosSync is built for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90 rounded-full px-8 cursor-pointer">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-full px-8 cursor-pointer">
                  <Link href="/contact-us">Contact Us <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </SlideUp>
      </section>
    </div>
  );
}