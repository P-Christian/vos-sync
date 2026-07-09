import {
  BookOpen, PenLine, DollarSign, Search,
  Clock, ChevronRight, ArrowRight, Sparkles, TrendingUp
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: BookOpen,
    title: "Interview Preparation",
    desc: "From phone screens to panel interviews — everything you need to walk in confident and walk out with an offer.",
    articles: 18,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: DollarSign,
    title: "Salary Negotiation",
    desc: "Don't leave money on the table. Learn how to research, benchmark, and negotiate the compensation you deserve.",
    articles: 12,
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Search,
    title: "Job Search Strategy",
    desc: "A system for finding and landing roles faster — with tactics for networking, outreach, and staying organized.",
    articles: 21,
    color: "bg-purple-50 text-purple-600",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Resume Tips": "bg-blue-50 text-blue-700",
  "Interview Prep": "bg-emerald-50 text-emerald-700",
  "Salary Guide": "bg-amber-50 text-amber-700",
  "Job Search": "bg-purple-50 text-purple-700",
  "Remote Work": "bg-teal-50 text-teal-700",
  "Career Change": "bg-rose-50 text-rose-700",
  "Career Strategy": "bg-zinc-100 text-zinc-700",
};

// ==========================================
// COMPONENT
// ==========================================

export default function CareerAdvice() {
  return (
    <div className="bg-white text-zinc-950 font-sans pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-5 py-1.5 px-4 rounded-full shadow-sm bg-white/70 backdrop-blur-sm text-sm">
            <Sparkles className="w-3.5 h-3.5 mr-2 text-yellow-500" />
            Career Advice
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 mb-6 max-w-4xl mx-auto leading-tight">
            Level up your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-900">
              career game.
            </span>
          </h1>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Expert articles, step-by-step guides, and real-world strategies for every stage of your career journey.
          </p>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-zinc-200 text-sm text-zinc-600 bg-white hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all duration-150 cursor-pointer font-medium"
              >
                {cat.label}
                <span className="text-xs opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ARTICLE */}
      <section className="py-16 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Editor&apos;s Pick</p>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Featured Article</h2>
            </div>
            <Button variant="ghost" className="hidden md:flex group cursor-pointer text-zinc-600">
              See all articles <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="group border border-zinc-200 rounded-3xl overflow-hidden hover:shadow-xl hover:border-zinc-300 transition-all duration-300 bg-white cursor-pointer">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Visual placeholder */}
              <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-700 p-12 flex flex-col justify-between min-h-[280px]">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-zinc-400 text-xs mb-1">{FEATURED_ARTICLE.author} · {FEATURED_ARTICLE.authorRole}</p>
                  <div className="h-1 w-10 bg-white/30 rounded-full mt-3" />
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-3 p-8 md:p-10 flex flex-col justify-center">
                <Badge className={`w-fit mb-4 text-xs font-semibold ${CATEGORY_COLORS[FEATURED_ARTICLE.category] || "bg-zinc-100 text-zinc-700"}`}>
                  {FEATURED_ARTICLE.category}
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4 leading-snug group-hover:text-zinc-700 transition-colors">
                  {FEATURED_ARTICLE.title}
                </h3>
                <p className="text-zinc-500 mb-6 leading-relaxed">{FEATURED_ARTICLE.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span>{FEATURED_ARTICLE.readTime}</span>
                    <span>·</span>
                    <span>{FEATURED_ARTICLE.date}</span>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full cursor-pointer group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all">
                    Read now <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLES GRID */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Latest</p>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Recent Articles</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map((article) => (
              <div
                key={article.id}
                className="group border border-zinc-200 rounded-2xl p-6 bg-white hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-pointer flex flex-col"
              >
                <Badge className={`w-fit mb-4 text-xs font-semibold ${CATEGORY_COLORS[article.category] || "bg-zinc-100 text-zinc-700"}`}>
                  {article.category}
                </Badge>
                <h3 className="text-base font-bold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors leading-snug flex-1">
                  {article.title}
                </h3>
                <p className="text-sm text-zinc-500 mb-4 leading-relaxed line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article.readTime}</span>
                    <span>·</span>
                    <span>{article.date}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button size="lg" variant="outline" className="rounded-full px-8 cursor-pointer">
              Load more articles
            </Button>
          </div>
        </div>
      </section>

      {/* GUIDES SECTION */}
      <section className="py-20 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Structured Learning</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4">In-depth guides</h2>
            <p className="text-zinc-500">
              Our curated guide collections take you from beginner to confident, step by step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {GUIDES.map((guide) => (
              <div
                key={guide.title}
                className="group border border-zinc-200 rounded-2xl p-6 bg-white hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${guide.color}`}>
                  <guide.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors">{guide.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">{guide.desc}</p>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">{guide.articles} articles</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 rounded-3xl px-8 py-14 md:px-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl -ml-20 -mb-20" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Get career tips in your inbox</h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto text-lg">
                Weekly advice from industry experts — no spam, no filler. Just insights that move your career forward.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 rounded-full px-8 cursor-pointer">
                  <Link href="/signup">Subscribe Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  <Link href="/">Browse Jobs <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
