"use client";

import  { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err?: unknown) => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (err?: unknown) => void;
          theme?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  className,
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Retrieve site key from client environment variables
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KY ||
    process.env.TURNSTILE_SITE_KY ||
    process.env.TURNSTILE_SITE_KEY ||
    "";

  useEffect(() => {
    // If no site key in env, fallback gracefully in dev mode
    if (!siteKey) {
      if (process.env.NODE_ENV === "development") {
        onVerify("dev-turnstile-bypass-token");
      }
      return;
    }

    if (window.turnstile && containerRef.current && !widgetIdRef.current) {
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            onVerify(token);
          },
          "expired-callback": () => {
            onExpire?.();
          },
          "error-callback": (err?: unknown) => {
            onError?.(err);
          },
          theme,
        });
      } catch (e) {
        console.error("Turnstile render error:", e);
      }
    }
  }, [scriptLoaded, siteKey, onVerify, onExpire, onError, theme]);

  if (!siteKey) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/20 p-4 flex items-center gap-3 text-xs text-muted-foreground", className)}>
        <Shield size={18} className="text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground">Turnstile Bot Protection</p>
          <p className="text-[11px] opacity-80">
            {process.env.NODE_ENV === "development"
              ? "Dev Mode: Automatically verified"
              : "Site Key missing. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.local"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("my-2 flex flex-col items-center justify-center min-h-[65px]", className)}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} id="turnstile-container" />
    </div>
  );
}

export default TurnstileWidget;
