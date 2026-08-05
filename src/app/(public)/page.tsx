import Link from "next/link";
import {
  Search, MapPin, ChevronRight, CheckCircle2, ArrowRight,
  Megaphone, PenTool, Database, HeartPulse,
  Code2, TrendingUp
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FadeIn, SlideUp, HoverScale, StaggerContainer, StaggerChild } from "@/components/shared/MotionContainer";

// ==========================================
// MOCK DATA
// ==========================================

const CATEGORIES = [
  { name: "Software Engineering", icon: <Code2 className="w-6 h-6" />, count: "1,240 jobs", color: "bg-blue-50 text-blue-600" },
  { name: "UI/UX Design", icon: <PenTool className="w-6 h-6" />, count: "850 jobs", color: "bg-pink-50 text-pink-600" },
  { name: "Marketing & Sales", icon: <Megaphone className="w-6 h-6" />, count: "1,020 jobs", color: "bg-orange-50 text-orange-600" },
  { name: "Data Science", icon: <Database className="w-6 h-6" />, count: "640 jobs", color: "bg-purple-50 text-purple-600" },
  { name: "Finance", icon: <TrendingUp className="w-6 h-6" />, count: "420 jobs", color: "bg-emerald-50 text-emerald-600" },
  { name: "Healthcare", icon: <HeartPulse className="w-6 h-6" />, count: "2,100 jobs", color: "bg-rose-50 text-rose-600" },
];

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getRelativeTimeString(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

interface RawJob {
  job_id: number;
  company_id: number | null;
  job_title: string;
  job_type: string;
  work_arrangement: string;
  job_location: string;
  salary_type: string;
  salary_min: number | string | null;
  salary_max: number | string | null;
  salary_negotiable: boolean;
  currency: string | null;
  created_at: string;
}

interface RawCompany {
  company_id: number;
  company_name: string;
  company_logo: string | null;
}

interface RawSkillMap {
  job_id: number;
  skill_id: {
    skill_name: string;
  } | null;
}

function formatSalary(job: RawJob): string {
  if (job.salary_negotiable) return "Negotiable";
  const currency = job.currency ?? "PHP";
  if (job.salary_type === "Fixed Salary" && job.salary_min) {
    return `${currency} ${Number(job.salary_min).toLocaleString()} / mo`;
  }
  if (job.salary_min && job.salary_max) {
    return `${currency} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()} / mo`;
  }
  if (job.salary_min) return `${currency} ${Number(job.salary_min).toLocaleString()}+ / mo`;
  return "Salary not disclosed";
}

async function getFeaturedJobs() {
  const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;

  try {
    const fields = [
      "job_id", "company_id", "job_title", "job_type", "work_arrangement",
      "job_location", "salary_type", "salary_min", "salary_max",
      "salary_negotiable", "currency", "created_at"
    ].join(",");
    
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[status][_eq]=ACTIVE&sort[]=-created_at&fields=${fields}&limit=6`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const rawJobs: RawJob[] = json.data ?? [];
    if (rawJobs.length === 0) return [];

    const jobIds = rawJobs.map((j) => j.job_id);
    const companyIds = Array.from(new Set(rawJobs.map((j) => j.company_id).filter((id): id is number => Boolean(id))));

    const companiesMap: Record<number, { name: string; logo: string | null }> = {};
    if (companyIds.length > 0) {
      const compRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=company_id,company_name,company_logo&limit=100`,
        { headers, cache: "no-store" }
      );
      if (compRes.ok) {
        const compJson = await compRes.json();
        (compJson.data ?? []).forEach((c: RawCompany) => {
          companiesMap[c.company_id] = {
            name: c.company_name,
            logo: c.company_logo ?? null,
          };
        });
      }
    }

    const skillsMap: Record<number, string[]> = {};
    if (jobIds.length > 0) {
      const skillsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_skills_map?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,skill_id.skill_name&limit=500`,
        { headers, cache: "no-store" }
      );
      if (skillsRes.ok) {
        const skillsJson = await skillsRes.json();
        (skillsJson.data ?? []).forEach((m: RawSkillMap) => {
          const jobId = m.job_id;
          if (!skillsMap[jobId]) skillsMap[jobId] = [];
          if (m.skill_id?.skill_name) {
            skillsMap[jobId].push(m.skill_id.skill_name);
          }
        });
      }
    }

    return rawJobs.map((j) => {
      const companyId = j.company_id;
      const company = (companyId ? companiesMap[companyId] : null) || { name: "Unknown Company", logo: null };
      return {
        id: j.job_id,
        title: j.job_title,
        company: company.name,
        location: j.job_location,
        type: j.job_type,
        salary: formatSalary(j),
        logo: company.logo ? `${DIRECTUS_BASE}/assets/${company.logo}` : getInitials(company.name),
        posted: getRelativeTimeString(j.created_at),
        tags: (skillsMap[j.job_id] ?? []).slice(0, 3),
      };
    });
  } catch (err) {
    console.error("Error loading featured jobs:", err);
    return [];
  }
}

const TRUSTED_COMPANIES = ["Google", "Microsoft", "Meta", "Amazon", "Netflix", "Apple"];

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export default async function Page() {
  const jobs = await getFeaturedJobs();

  return (
    <div className="bg-background pt-16 text-foreground font-sans selection:bg-muted">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-background to-background dark:from-zinc-900"></div>
        <div className="absolute top-0 right-0 -z-10 translate-x-1/3 -translate-y-1/4 opacity-40 dark:opacity-20">
          <div className="w-[600px] h-[600px] rounded-full bg-blue-50 dark:bg-blue-900/30 blur-3xl mix-blend-multiply dark:mix-blend-screen"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <StaggerContainer>
            <StaggerChild>
              <Badge variant="secondary" className="mb-6 py-1.5 px-4 rounded-full shadow-sm bg-background/50 backdrop-blur-sm text-sm border-border">
             
                Over 10,000+ new jobs added this week
              </Badge>
            </StaggerChild>

            <StaggerChild>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight">
                Find the job that fits your <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-900 dark:from-zinc-400 dark:to-zinc-100">life.</span>
              </h1>
            </StaggerChild>

            <StaggerChild>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Discover opportunities across the globe. Join the most exclusive network of top tier professionals and industry-leading companies.
              </p>
            </StaggerChild>

            <StaggerChild>
              {/* Search Bar */}
              <div className="max-w-4xl mx-auto bg-card p-2 rounded-2xl shadow-xl border border-border flex flex-col md:flex-row gap-2 relative z-10">
                <div className="flex-1 flex items-center px-4 py-2 border-b md:border-b-0 md:border-r border-border">
                  <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
                  <Input
                    type="text"
                    placeholder="Job title, keywords, or company"
                    className="border-0 shadow-none focus-visible:ring-0 px-0 text-base h-auto py-1 bg-transparent"
                  />
                </div>
                <div className="flex-1 flex items-center px-4 py-2">
                  <MapPin className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
                  <Input
                    type="text"
                    placeholder="City, state, or 'Remote'"
                    className="border-0 shadow-none focus-visible:ring-0 px-0 text-base h-auto py-1 bg-transparent"
                  />
                </div>
                <Button size="lg" className="rounded-xl w-full md:w-auto px-8 py-6 text-base shadow-md hover:shadow-lg transition-all cursor-pointer">
                  Search Jobs
                </Button>
              </div>
            </StaggerChild>

            <StaggerChild>
              <div className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
                <span>Popular searches:</span>
                <Link href="#" className="hover:text-foreground underline underline-offset-4">Remote</Link>
                <Link href="#" className="hover:text-foreground underline underline-offset-4">React</Link>
                <Link href="#" className="hover:text-foreground underline underline-offset-4">Designer</Link>
                <Link href="#" className="hover:text-foreground underline underline-offset-4">Marketing</Link>
              </div>
            </StaggerChild>
          </StaggerContainer>
        </div>
      </section>

      {/* LOGO CLOUD */}
      <section className="border-y border-border bg-muted/30 py-10">
        <FadeIn delay={0.4} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">Trusted by the world&apos;s most innovative companies</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {TRUSTED_COMPANIES.map(company => (
              <div key={company} className="text-xl md:text-2xl font-bold tracking-tighter text-zinc-400 dark:text-zinc-600">
                {company}
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Popular Categories</h2>
              <p className="text-muted-foreground mt-2">Explore jobs across various domains and industries</p>
            </div>
            <Button variant="ghost" className="hidden md:flex group cursor-pointer">
              View all categories <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, idx) => (
              <StaggerChild key={idx}>
                <HoverScale className="h-full">
                  <div className="group border border-border rounded-2xl p-6 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 cursor-pointer bg-card h-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cat.color} dark:bg-opacity-20`}>
                      {cat.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.name}</h3>
                    <p className="text-muted-foreground mt-1 flex items-center text-sm">
                      {cat.count} <ChevronRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </p>
                  </div>
                </HoverScale>
              </StaggerChild>
            ))}
          </StaggerContainer>
          <Button variant="outline" className="w-full mt-8 md:hidden cursor-pointer">View all categories</Button>
        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured Opportunities</h2>
            <p className="text-muted-foreground mt-4">Hand-picked roles from top companies actively hiring right now.</p>
          </div>

          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <StaggerChild key={job.id}>
                <HoverScale className="h-full">
                  <div className="bg-card border border-border p-6 rounded-2xl hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start h-full">
                    {/* Company Logo Placeholder */}
                    <div className="w-14 h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden">
                      {typeof job.logo === "string" && (job.logo.startsWith("http") || job.logo.startsWith("/")) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={job.logo} alt={job.company} className="w-full h-full object-cover" />
                      ) : (
                        job.logo
                      )}
                    </div>

                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">{job.title}</h3>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                            <span className="font-medium text-foreground">{job.company}</span>
                            <span>•</span>
                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {job.location}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-muted shrink-0">{job.type}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 mb-6">
                        {job.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="font-medium text-xs">{tag}</Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                        <div className="font-semibold text-foreground">{job.salary}</div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{job.posted}</span>
                          <Button size="sm" variant="outline" className="rounded-full shadow-sm cursor-pointer" asChild>
                            <Link href="/find-jobs">View Details</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </HoverScale>
              </StaggerChild>
            ))}
          </StaggerContainer>

          <div className="mt-12 text-center">
            <Button size="lg" className="rounded-full px-8 cursor-pointer" asChild>
              <Link href="/find-jobs">Explore All Jobs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / VALUE PROP */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <SlideUp className="lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">
                Your next career move, <br /><span className="text-muted-foreground">simplified.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We&apos;ve streamlined the job search process so you can focus on what matters most—preparing for your next big role.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Create your profile", desc: "Build a standout profile in minutes. Let your experience shine." },
                  { title: "Get personalized matches", desc: "Our algorithm suggests roles based on your skills and preferences." },
                  { title: "Apply with one click", desc: "Say goodbye to repetitive forms. Apply to multiple jobs instantly." }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1 bg-muted p-2 rounded-full h-fit">
                      <CheckCircle2 className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">{step.title}</h4>
                      <p className="text-muted-foreground mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SlideUp>

            <SlideUp className="lg:w-1/2 relative" delay={0.2}>
              {/* Decorative UI element representing a dashboard */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl relative z-10">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted"></div>
                    <div>
                      <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                      <div className="h-3 w-16 bg-muted/50 rounded"></div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-transparent">Profile Complete</Badge>
                </div>

                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted"></div>
                        <div>
                          <div className="h-4 w-32 bg-muted rounded mb-2"></div>
                          <div className="h-3 w-20 bg-muted/50 rounded"></div>
                        </div>
                      </div>
                      <div className="h-8 w-20 bg-foreground rounded-md opacity-20"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Background decorative blobs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-muted rounded-full blur-3xl -z-10 dark:opacity-20"></div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24">
        <SlideUp className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 dark:bg-zinc-950 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden border dark:border-zinc-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 dark:bg-zinc-900 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-800 dark:bg-zinc-900 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-50">Ready to accelerate your career?</h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
                Join thousands of professionals who have found their dream jobs through our platform. Create your free account today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                  Get Started for Free
                </Button>
                <Button size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  Post a Job
                </Button>
              </div>
            </div>
          </div>
        </SlideUp>
      </section>
    </div>
  );
}
