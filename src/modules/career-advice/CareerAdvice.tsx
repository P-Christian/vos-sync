"use client";

import React from "react";
import {
  BookOpen, PenLine, DollarSign, Search,
  Clock, ChevronRight, ArrowRight, TrendingUp,
  UserCheck, Building2, LayoutDashboard, Briefcase
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SlideUp } from "@/components/shared/MotionContainer";

// ==========================================
// MOCK DATA
// ==========================================

const CATEGORIES = [
  { label: "Resume Tips", count: 48 },
  { label: "Interview Prep", count: 36 },
  { label: "Salary Guides", count: 24 },
  { label: "Career Change", count: 19 },
  { label: "Remote Work", count: 31 },
  { label: "Leadership", count: 15 },
  { label: "Freelancing", count: 22 },
  { label: "Job Search", count: 40 },
];

const FEATURED_ARTICLE = {
  category: "Career Strategy",
  title: "The 2025 Career Playbook: How Top Professionals Land Their Dream Jobs",
  excerpt:
    "We analyzed over 10,000 successful hires to uncover the exact strategies, habits, and frameworks that set top candidates apart in a competitive market.",
  readTime: "12 min read",
  date: "Jul 5, 2025",
  author: "Sarah Chen",
  authorRole: "Head of Talent Insights",
};

const ARTICLES = [
  {
    id: 1,
    category: "Resume Tips",
    title: "7 Resume Mistakes That Get You Ignored Instantly",
    excerpt: "ATS systems filter 75% of applicants before a human ever sees your resume. Here's how to get past them.",
    readTime: "6 min read",
    date: "Jul 3, 2025",
  },
  {
    id: 2,
    category: "Interview Prep",
    title: "How to Answer 'Tell Me About Yourself' Like a Pro",
    excerpt: "This question trips up even experienced professionals. Here's a proven structure that works every time.",
    readTime: "5 min read",
    date: "Jul 1, 2025",
  },
  {
    id: 3,
    category: "Salary Guide",
    title: "Tech Salaries in 2025: A Full Breakdown by Role and Region",
    excerpt: "From junior devs to CTOs — here's what companies are actually paying this year, by city and stack.",
    readTime: "9 min read",
    date: "Jun 28, 2025",
  },
  {
    id: 4,
    category: "Job Search",
    title: "The Cold Email That Got Me 3 Job Offers in 2 Weeks",
    excerpt: "A real template and strategy for reaching hiring managers directly, without applying through a portal.",
    readTime: "4 min read",
    date: "Jun 25, 2025",
  },
  {
    id: 5,
    category: "Remote Work",
    title: "Landing a Remote Role Abroad: What They Don't Tell You",
    excerpt: "From tax implications to timezone alignment — the practical guide to working remotely for a foreign company.",
    readTime: "8 min read",
    date: "Jun 22, 2025",
  },
  {
    id: 6,
    category: "Career Change",
    title: "How to Pivot Careers Without Starting From Zero",
    excerpt: "Your existing experience is more transferable than you think. Here's how to position it for a new industry.",
    readTime: "7 min read",
    date: "Jun 19, 2025",
  },
];

const GUIDES = [
  {
    icon: PenLine,
    title: "Resume Writing Guide",
    desc: "Build a standout resume that passes ATS filters and impresses hiring managers. Includes templates and real examples.",
    articles: 24,
    color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Interview Preparation",
    desc: "From phone screens to panel interviews — everything you need to walk in confident and walk out with an offer.",
    articles: 18,
    color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: DollarSign,
    title: "Salary Negotiation",
    desc: "Don't leave money on the table. Learn how to research, benchmark, and negotiate the compensation you deserve.",
    articles: 12,
    color: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Search,
    title: "Job Search Strategy",
    desc: "A system for finding and landing roles faster — with tactics for networking, outreach, and staying organized.",
    articles: 21,
    color: "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Resume Tips": "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  "Interview Prep": "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  "Salary Guide": "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  "Job Search": "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  "Remote Work": "bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20",
  "Career Change": "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  "Career Strategy": "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
};

// ==========================================
// COMPONENT
// ==========================================

export default function CareerAdvice() {
  const session = useAuthSession();

  return (
    <div className="text-foreground font-sans md:pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase shadow-2xs mb-5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Career Advice & Resources</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
            Level up your{" "}
            <span className="text-primary underline decoration-primary/30 underline-offset-8">
              career game.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Expert articles, step-by-step guides, and real-world strategies for every stage of your career journey.
          </p>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                className="inline-flex items-center gap-1.5 px-4 py-3 md:py-1.5 rounded-full border border-border/80 text-sm text-foreground bg-white/80 dark:bg-card/75 backdrop-blur-xl hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white hover:border-primary/50 transition-all duration-200 cursor-pointer font-medium shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.18)]"
              >
                {cat.label}
                <span className="text-xs opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ARTICLE */}
      <section className="py-14 md:py-16 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Editor&apos;s Pick</p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Featured Article</h2>
            </div>
            <Button variant="ghost" className="hidden md:flex group cursor-pointer text-muted-foreground hover:text-foreground">
              See all articles <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="group border border-border/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(79,70,229,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_14px_40px_rgba(37,99,235,0.18)] hover:border-primary/40 transition-all duration-300 bg-white/85 dark:bg-card/75 backdrop-blur-xl cursor-pointer">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Visual placeholder */}
              <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-8 md:p-12 flex flex-col justify-between min-h-[180px] md:min-h-[280px] text-white">
                <div className="w-12 h-12 bg-white/15 backdrop-blur-xs rounded-xl flex items-center justify-center border border-white/20">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-xs mb-1 font-medium">{FEATURED_ARTICLE.author} · {FEATURED_ARTICLE.authorRole}</p>
                  <div className="h-1 w-12 bg-white/40 rounded-full mt-3" />
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-3 p-6 md:p-10 flex flex-col justify-center">
                <Badge className={`w-fit mb-4 text-xs font-semibold ${CATEGORY_COLORS[FEATURED_ARTICLE.category] || "bg-muted text-muted-foreground"}`}>
                  {FEATURED_ARTICLE.category}
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-snug group-hover:text-primary transition-colors">
                  {FEATURED_ARTICLE.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{FEATURED_ARTICLE.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{FEATURED_ARTICLE.readTime}</span>
                    <span>·</span>
                    <span>{FEATURED_ARTICLE.date}</span>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full cursor-pointer group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all border-border h-11 md:h-8">
                    Read now <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLES GRID */}
      <section className="py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Latest</p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Recent Articles</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {ARTICLES.map((article) => (
              <div
                key={article.id}
                className="group border border-border/80 rounded-2xl p-4 sm:p-6 bg-white/85 dark:bg-card/75 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_30px_rgba(37,99,235,0.12)] hover:border-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <Badge className={`w-fit mb-4 text-xs font-semibold ${CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"}`}>
                    {article.category}
                  </Badge>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">{article.excerpt}</p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article.readTime}</span>
                    <span>·</span>
                    <span>{article.date}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button size="lg" variant="outline" className="rounded-full px-8 cursor-pointer border-border hover:border-primary/40 hover:bg-white/90 dark:hover:bg-card/90 shadow-2xs h-11 md:h-10">
              Load more articles
            </Button>
          </div>
        </div>
      </section>

      {/* GUIDES SECTION */}
      <section className="py-14 md:py-20 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Structured Learning</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">In-depth guides</h2>
            <p className="text-muted-foreground">
              Our curated guide collections take you from beginner to confident, step by step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {GUIDES.map((guide) => (
              <div
                key={guide.title}
                className="group border border-border/80 rounded-2xl p-6 bg-white/85 dark:bg-card/75 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_30px_rgba(37,99,235,0.12)] hover:border-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${guide.color}`}>
                    <guide.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{guide.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{guide.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">{guide.articles} articles</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Accelerate your career journey</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Apply expert insights directly to your active job applications and land interviews faster.
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Build a high-performing team</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Learn how industry-leading companies source, interview, and retain world-class talent.
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Empower students and candidates</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Access your dashboard tools to guide candidate career readiness and manage verification.
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
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">Get career tips in your inbox</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                  Weekly advice from industry experts — no spam, no filler. Just insights that move your career forward.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-sky-600 hover:brightness-110 text-white rounded-full px-8 cursor-pointer shadow-sm hover:shadow-md transition-all h-11 md:h-10">
                    <Link href="/signup">Create Free Account</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-full px-8 cursor-pointer h-11 md:h-10">
                    <Link href="/find-jobs">Browse Jobs <ArrowRight className="ml-2 w-4 h-4" /></Link>
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
