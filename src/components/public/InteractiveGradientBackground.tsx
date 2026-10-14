"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface InteractiveGradientBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  /** Controls overall glow intensity */
  intensity?: "subtle" | "medium" | "vibrant";
  /** Enables or disables the dynamic cursor spotlight */
  enableSpotlight?: boolean;
}

const INTENSITY_CONFIG = {
  subtle: {
    baseGlow: "from-primary/[0.12] via-primary/[0.04] to-transparent",
    topEllipse: "hsl(var(--primary) / 0.18)",
    wave1: "from-primary/20 via-info/15 to-primary/10",
    wave2: "from-secondary/30 via-primary/15 to-info/10",
    wave3: "from-info/15 via-primary/15 to-secondary/25",
    spotlightAlpha: "0.18",
  },
  medium: {
    baseGlow: "from-primary/[0.18] via-primary/[0.06] to-transparent",
    topEllipse: "hsl(var(--primary) / 0.26)",
    wave1: "from-primary/28 via-info/22 to-primary/18",
    wave2: "from-secondary/40 via-primary/22 to-info/18",
    wave3: "from-info/20 via-primary/22 to-secondary/35",
    spotlightAlpha: "0.24",
  },
  vibrant: {
    baseGlow: "from-primary/[0.24] via-primary/[0.08] to-transparent",
    topEllipse: "hsl(var(--primary) / 0.34)",
    wave1: "from-primary/36 via-info/28 to-primary/24",
    wave2: "from-secondary/50 via-primary/28 to-info/24",
    wave3: "from-info/26 via-primary/28 to-secondary/45",
    spotlightAlpha: "0.30",
  },
};

export function InteractiveGradientBackground({
  children,
  className,
  intensity = "medium",
  enableSpotlight = true,
}: InteractiveGradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isTabHidden, setIsTabHidden] = React.useState(false);
  const activeIntensity = INTENSITY_CONFIG[intensity] ?? INTENSITY_CONFIG.medium;

  // Pause CSS animations when browser tab is inactive to preserve CPU & battery
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!enableSpotlight) return;

    const container = containerRef.current;
    if (!container) return;

    // Honor accessibility preferences and skip listeners on touch/coarse pointers
    if (typeof window !== "undefined") {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
      if (prefersReducedMotion || isTouchDevice) return;
    }

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (document.hidden) return;
      const rect = container.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (container) {
            container.style.setProperty("--mouse-x", `${targetX}px`);
            container.style.setProperty("--mouse-y", `${targetY}px`);
            container.style.setProperty("--spotlight-opacity", "1");
          }
          rafId = null;
        });
      }
    };

    const handlePointerLeave = () => {
      if (container) {
        container.style.setProperty("--spotlight-opacity", "0.65");
      }
    };

    // Attach to window or parent element to smoothly track pointer movements across the entire page
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enableSpotlight]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-[1800px] max-h-full z-0 overflow-hidden select-none [mask-image:linear-gradient(to_bottom,black_65%,transparent)]",
        className
      )}
      style={{
        ["--mouse-x" as string]: "50%",
        ["--mouse-y" as string]: "20%",
        ["--spotlight-opacity" as string]: "0.75",
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes vos-aurora-1 {
          0% {
            transform: translate3d(0, 0, 0) rotate(-6deg) scaleY(0.95);
          }
          50% {
            transform: translate3d(50px, 40px, 0) rotate(5deg) scaleY(1.15);
          }
          100% {
            transform: translate3d(-40px, 70px, 0) rotate(-3deg) scaleY(1.05);
          }
        }
        @keyframes vos-aurora-2 {
          0% {
            transform: translate3d(0, 0, 0) rotate(6deg) scaleX(1);
          }
          50% {
            transform: translate3d(-60px, -45px, 0) rotate(-5deg) scaleX(1.18);
          }
          100% {
            transform: translate3d(40px, 50px, 0) rotate(7deg) scaleX(0.95);
          }
        }
        @keyframes vos-aurora-3 {
          0% {
            transform: translate3d(0, 0, 0) rotate(-4deg) scale(1);
          }
          50% {
            transform: translate3d(45px, -35px, 0) rotate(6deg) scale(1.12);
          }
          100% {
            transform: translate3d(-50px, 40px, 0) rotate(-2deg) scale(0.96);
          }
        }
        .vos-aurora-paused {
          animation-play-state: paused !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .vos-aurora-wave-1,
          .vos-aurora-wave-2,
          .vos-aurora-wave-3 {
            animation: none !important;
          }
        }
      `}</style>

      {/* Layer 1: Ambient Base Linear Wash */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b transition-colors duration-700",
          activeIntensity.baseGlow
        )}
      />

      {/* Layer 2: Radial Ellipse Atmosphere Glow at Top */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 85% 65% at 50% -10%, ${activeIntensity.topEllipse}, transparent 75%)`,
        }}
      />

      {/* Layer 3: Fluid Aurora Wave Ribbons (GPU-accelerated transforms) */}
      {/* Aurora Wave 1: Top-Left to Center */}
      <div
        className={cn(
          "vos-aurora-wave-1 absolute -top-28 -left-[10%] h-[750px] w-[125%] rounded-[100%] blur-[110px]",
          "bg-gradient-to-r opacity-70 dark:opacity-40 will-change-transform",
          activeIntensity.wave1,
          isTabHidden && "vos-aurora-paused"
        )}
        style={{ animation: "vos-aurora-1 22s ease-in-out infinite alternate" }}
      />

      {/* Aurora Wave 2: Mid-Right to Center (Flows behind Logo Cloud & Categories) */}
      <div
        className={cn(
          "vos-aurora-wave-2 absolute top-44 -right-[12%] h-[820px] w-[120%] rounded-[100%] blur-[120px]",
          "bg-gradient-to-r opacity-65 dark:opacity-35 will-change-transform",
          activeIntensity.wave2,
          isTabHidden && "vos-aurora-paused"
        )}
        style={{ animation: "vos-aurora-2 28s ease-in-out infinite alternate" }}
      />

      {/* Aurora Wave 3: Lower Reach (Flows behind Popular Categories cards) */}
      <div
        className={cn(
          "vos-aurora-wave-3 absolute top-[620px] left-[5%] h-[720px] w-[100%] rounded-[100%] blur-[105px]",
          "bg-gradient-to-r opacity-55 dark:opacity-30 will-change-transform",
          activeIntensity.wave3,
          isTabHidden && "vos-aurora-paused"
        )}
        style={{ animation: "vos-aurora-3 25s ease-in-out infinite alternate" }}
      />

      {/* Layer 4: Dynamic Interactive Cursor Spotlight Follower */}
      {enableSpotlight && (
        <div
          className="absolute inset-0 transition-opacity duration-300 ease-out"
          style={{
            opacity: "var(--spotlight-opacity, 0.75)",
            background: `radial-gradient(700px circle at var(--mouse-x, 50%) var(--mouse-y, 20%), hsl(var(--primary) / ${activeIntensity.spotlightAlpha}) 0%, hsl(var(--info) / 0.08) 35%, transparent 75%)`,
          }}
        />
      )}

      {/* Optional Child Elements */}
      {children}
    </div>
  );
}
