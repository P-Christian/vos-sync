// src/modules/client/components/ListSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  rows?: number;
  /** Announced to screen readers while the list loads. */
  label?: string;
}

/**
 * Placeholder rows shown while a list loads. Keeps the page height stable (no layout
 * jump when data arrives) and is announced to assistive tech via role="status".
 */
export default function ListSkeleton({ rows = 5, label = "Loading…" }: ListSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4"
          style={{ opacity: Math.max(0.35, 1 - i * 0.15) }}
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="hidden h-8 w-24 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
