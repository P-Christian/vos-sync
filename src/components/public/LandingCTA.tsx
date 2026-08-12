"use client";

import React from "react";
import Link from "next/link";
import { UserCheck, Building2, LayoutDashboard, Briefcase, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideUp } from "@/components/shared/MotionContainer";
import { useAuthSession } from "@/hooks/useAuthSession";

export function LandingCTA() {
  const session = useAuthSession();

  return (
    <section className="py-24">
      <SlideUp className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-zinc-900 dark:bg-zinc-950 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden border dark:border-zinc-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 dark:bg-zinc-900 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-800 dark:bg-zinc-900 rounded-full blur-3xl -ml-20 -mb-20" />

          {session.isJobSeeker ? (
            /* Logged in Job Seeker View */
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-50">
                Ready to accelerate your career?
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
                Explore thousands of verified jobs from industry-leading companies and track your applications.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                  <Link href="/vos-sync/freelancer" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Go to Job Seeker Portal
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  <Link href="/find-jobs" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Explore All Jobs
                  </Link>
                </Button>
              </div>
            </div>
          ) : session.isEmployer ? (
            /* Logged in Employer View */
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-50">
                Ready to scale your team?
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
                Manage your job postings, review applicants, and source top verified talent across industries.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                  <Link href="/vos-sync/client/manage-jobs" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Go to Client Portal
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  <Link href="/vos-sync/client/manage-jobs" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Post a Job
                  </Link>
                </Button>
              </div>
            </div>
          ) : session.isAdmin || session.isSchool ? (
            /* Logged in Admin / School View */
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-50">
                Manage your organization on VosSync
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
                Access your organization dashboard to verify records and monitor platform operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                  <Link href={session.dashboard || "/vos-sync/admin"} className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  <Link href="/find-jobs">Browse Jobs</Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Guest / Unauthenticated View */
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-zinc-50">
                Ready to accelerate your career?
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
                Join thousands of professionals who have found their dream jobs through our platform. Create your free account today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full px-8 cursor-pointer">
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  <Link href="/signup?role=employer">Post a Job <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideUp>
    </section>
  );
}
