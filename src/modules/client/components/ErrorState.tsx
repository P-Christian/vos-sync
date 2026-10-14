// src/modules/client/components/ErrorState.tsx
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  /** When provided, a "Try again" button is shown. */
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Inline error with a retry action, for when a list or panel fails to load. */
export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center py-14 text-center", className)}>
      <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground md:text-xs">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="mt-4 gap-2 max-md:min-h-10">
          <RotateCcw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
