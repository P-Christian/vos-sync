// src/app/(public)/find-jobs/page.tsx
import FindJobsModule from "@/modules/public/find-jobs";

export const metadata = {
  title: "Find Jobs & Career Opportunities | VOS-Sync",
  description:
    "Explore open job listings, remote positions, and career opportunities across verified companies in the Philippines.",
};

export default function FindJobsPage() {
  return <FindJobsModule />;
}
