import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StudentInvitationTerminalVariant =
  | "expired"
  | "used"
  | "registered"
  | "invalid"
  | "conflict";

interface TerminalCopy {
  icon: LucideIcon;
  destructive: boolean;
  title: string;
  body: string;
}

const TERMINAL_COPY: Record<StudentInvitationTerminalVariant, TerminalCopy> = {
  invalid: {
    icon: ShieldAlert,
    destructive: true,
    title: "This invitation link isn't valid",
    body: "The link may be incomplete or incorrect. Open the full link from your invitation email, or contact your school to send you a new invitation.",
  },
  expired: {
    icon: Clock,
    destructive: true,
    title: "This invitation has expired",
    body: "Invitation links are only valid for a limited time. Please contact your school to send you a new invitation.",
  },
  used: {
    icon: AlertTriangle,
    destructive: true,
    title: "This invitation was already used",
    body: "This link can only be used once. If you didn't complete this registration, please contact your school for a new invitation.",
  },
  registered: {
    icon: CheckCircle2,
    destructive: false,
    title: "This invitation is already registered",
    body: "An account is already linked to this invitation. If it was you, sign in to continue. Otherwise, contact your school for a new invitation.",
  },
  conflict: {
    icon: AlertTriangle,
    destructive: true,
    title: "We couldn't link this invitation",
    body: "This invitation cannot be linked with the current account. Please contact your school so they can help you continue.",
  },
};

/**
 * Friendly end-state for invitation links that can no longer be used. Copy is
 * deliberately generic: no internal ids, emails, tokens, or state names are
 * surfaced.
 */
export function StudentInvitationTerminalScreen({
  variant,
}: {
  variant: StudentInvitationTerminalVariant;
}) {
  const copy = TERMINAL_COPY[variant];
  const Icon = copy.icon;

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 text-center">
      <div
        className={
          copy.destructive
            ? "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            : "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        }
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl md:text-3xl font-medium text-primary mb-3">{copy.title}</h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">{copy.body}</p>

      <div className="flex flex-col items-center gap-3">
        {variant === "registered" && (
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
