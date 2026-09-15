import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6 p-6">
      {/* Header Banner Skeleton */}
      <div className="h-24 w-full rounded-2xl bg-slate-900/90 p-6 flex items-center justify-between border border-white/10 shadow-xl animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl bg-white/20 shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/10" />
          </div>
        </div>
      </div>

      {/* 3-Stats Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SchoolProfileSkeleton() {
  return (
    <div className="w-[92%] max-w-[2000px] mx-auto space-y-6">
      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* School Information Card */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-6 py-4 bg-muted/20 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <div className="p-6 space-y-6">
              {/* Cover Banner Skeleton */}
              <div className="relative rounded-2xl overflow-hidden border bg-muted/30">
                <Skeleton className="w-full aspect-[3/1] max-h-[260px] rounded-none" />
                <div className="px-6 pb-6 pt-0 relative flex items-end gap-4 -mt-12 sm:-mt-14 z-10">
                  <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-card shrink-0" />
                  <div className="space-y-2 mb-1 flex-1">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                </div>
              </div>

              {/* Contact Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              {/* Description Skeleton */}
              <div className="pt-4 border-t space-y-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Mission & Values Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Campus Location & Address Card */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-6 py-4 bg-muted/20 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="pt-4 border-t space-y-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          {/* Completion Bar */}
          <div className="rounded-2xl border bg-card p-5 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-3 w-48" />
          </div>

          {/* Verification Status */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-5 py-3.5 bg-muted/20 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-md" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="p-5 space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>

          {/* Verification Documents (Dedicated Skeleton) */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-5 py-3.5 bg-muted/20 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-md" />
              <Skeleton className="h-3.5 w-36" />
            </div>
            <div className="p-5 space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>

          {/* Institutional Metrics */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-5 py-3.5 bg-muted/20 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-md" />
              <Skeleton className="h-3.5 w-36" />
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Preview Public Profile */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-5 py-3.5 bg-muted/20 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-md" />
              <Skeleton className="h-3.5 w-36" />
            </div>
            <div className="p-5 space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>

          {/* Public Visibility */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden py-0 gap-0">
            <div className="border-b px-5 py-3.5 bg-muted/20 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-md" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="p-5 flex justify-between items-center">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoursesSkeleton() {
  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6 p-6">
      {/* Header Banner Skeleton */}
      <div className="h-24 w-full rounded-2xl bg-slate-900/90 p-6 flex items-center justify-between border border-white/10 shadow-xl animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl bg-white/20 shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/10" />
          </div>
        </div>
      </div>

      {/* Data Table Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-3 flex-1">
          <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Data Table Skeleton */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/40 flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-60" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudentRosterSkeleton() {
  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6 p-6">
      {/* Header Banner Skeleton */}
      <div className="h-24 w-full rounded-2xl bg-slate-900/90 p-6 flex items-center justify-between border border-white/10 shadow-xl animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl bg-white/20 shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 bg-white/20" />
            <Skeleton className="h-4 w-96 bg-white/10" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-lg bg-white/20" />
          <Skeleton className="h-10 w-32 rounded-lg bg-white/20" />
        </div>
      </div>

      {/* Roster Filters Toolbar Skeleton */}
      <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-3 flex-1">
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>
      </div>

      {/* Student Roster Table Skeleton */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/40 flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
