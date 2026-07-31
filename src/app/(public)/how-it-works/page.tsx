// src/app/(public)/how-it-works/page.tsx
import { Suspense } from "react";
import HowItWorksModule from "@/modules/public/how-it-works";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How VOS Sync Works — Role-Based Process Roadmap",
  description:
    "Explore the step-by-step onboarding, verification, and activity roadmaps for Employees, Employers, and Schools on VOS Sync.",
  openGraph: {
    title: "How VOS Sync Works | Step-by-Step Platform Roadmap",
    description:
      "Discover how VOS Sync connects verified employees, hiring companies, and academic institutions in a secure ecosystem.",
    url: "https://vos-sync.com/how-it-works",
    siteName: "VOS Sync",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How VOS Sync Works — Process Roadmap",
    description: "Learn how to register, verify credentials, and connect on VOS Sync.",
  },
  alternates: {
    canonical: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-12 text-center text-xs text-muted-foreground">
          Loading Process Guide...
        </div>
      }
    >
      <HowItWorksModule />
    </Suspense>
  );
}
