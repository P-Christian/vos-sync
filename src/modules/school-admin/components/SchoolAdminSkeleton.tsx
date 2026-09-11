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
        <Skeleton className="h-10 w-28 rounded-lg bg-white/20" />
      </div>

      {/* Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Identity Card Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 space-y-4 shadow-sm">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* Right Form Cards Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-4">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 md:col-span-2 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-24 md:col-span-2 rounded-xl" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-4">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 md:col-span-2 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
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
