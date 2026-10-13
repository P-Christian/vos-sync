
"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({
  className = "",
}: AuroraBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let frameId = 0;
    let running = false;

    let pointerX = 50;
    let pointerY = 35;
    let targetX = 50;
    let targetY = 35;

    const animatePointer = () => {
      frameId = 0;

      pointerX += (targetX - pointerX) * 0.12;
      pointerY += (targetY - pointerY) * 0.12;

      root.style.setProperty("--pointer-x", `${pointerX}%`);
      root.style.setProperty("--pointer-y", `${pointerY}%`);

      if (
        Math.abs(targetX - pointerX) > 0.1 ||
        Math.abs(targetY - pointerY) > 0.1
      ) {
        frameId = window.requestAnimationFrame(animatePointer);
      } else {
        running = false;
      }
    };

    const scheduleAnimation = () => {
      if (!running) {
        running = true;
        frameId = window.requestAnimationFrame(animatePointer);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || event.pointerType === "touch") {
        return;
      }

      targetX = (event.clientX / Math.max(window.innerWidth, 1)) * 100;
      targetY = (event.clientY / Math.max(window.innerHeight, 1)) * 100;

      scheduleAnimation();
    };

    const resetPointer = () => {
      targetX = 50;
      targetY = 35;
      scheduleAnimation();
    };

    const handleMotionPreferenceChange = () => {
      if (reducedMotion.matches) {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }

        running = false;
        pointerX = 50;
        pointerY = 35;
        targetX = 50;
        targetY = 35;

        root.style.setProperty("--pointer-x", "50%");
        root.style.setProperty("--pointer-y", "35%");
      }
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", resetPointer);
    document.documentElement.addEventListener(
      "pointerleave",
      resetPointer,
    );
    reducedMotion.addEventListener(
      "change",
      handleMotionPreferenceChange,
    );

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetPointer);
      document.documentElement.removeEventListener(
        "pointerleave",
        resetPointer,
      );
      reducedMotion.removeEventListener(
        "change",
        handleMotionPreferenceChange,
      );

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`ab-root pointer-events-none absolute inset-0 isolate overflow-hidden ${className}`}
      style={
        {
          "--pointer-x": "50%",
          "--pointer-y": "35%",
        } as CSSProperties
      }
    >
      <div className="ab-base absolute inset-0" />

      {/* Independent, continuously animated aurora layers */}
      <div className="ab-aurora ab-aurora-one absolute" />
      <div className="ab-aurora ab-aurora-two absolute" />
      <div className="ab-aurora ab-aurora-three absolute" />

      {/* Independent pointer-following spotlight */}
      <div className="ab-pointer-glow absolute inset-0" />

      <style jsx>{`
        .ab-root {
          z-index: 0;
          background: #f8fbff;
          isolation: isolate;
          contain: paint;
        }

        .ab-base {
          background:
            radial-gradient(
              ellipse at 50% -10%,
              rgba(219, 234, 254, 0.92) 0%,
              rgba(248, 251, 255, 0.86) 44%,
              rgba(255, 255, 255, 0.98) 100%
            ),
            #f8fbff;
        }

        .ab-aurora {
          width: 78%;
          height: 62%;
          border-radius: 9999px;
          filter: blur(64px);
          opacity: 0.52;
          mix-blend-mode: multiply;
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }

        .ab-aurora-one {
          top: -26%;
          left: -12%;
          background: linear-gradient(
            120deg,
            rgba(96, 165, 250, 0.44),
            rgba(191, 219, 254, 0.14) 52%,
            transparent
          );
          animation: ab-flow-one 23s ease-in-out infinite alternate;
        }

        .ab-aurora-two {
          top: 4%;
          right: -24%;
          width: 76%;
          height: 56%;
          background: linear-gradient(
            225deg,
            rgba(56, 189, 248, 0.28),
            rgba(129, 140, 248, 0.22) 48%,
            transparent
          );
          animation: ab-flow-two 29s ease-in-out infinite alternate;
        }

        .ab-aurora-three {
          top: 34%;
          left: 12%;
          width: 80%;
          height: 46%;
          background: linear-gradient(
            110deg,
            rgba(147, 197, 253, 0.18),
            rgba(224, 242, 254, 0.3) 46%,
            rgba(165, 180, 252, 0.14)
          );
          opacity: 0.36;
          animation: ab-flow-three 34s ease-in-out infinite alternate;
        }

        .ab-pointer-glow {
          background: radial-gradient(
            420px circle at var(--pointer-x) var(--pointer-y),
            rgba(96, 165, 250, 0.16),
            rgba(147, 197, 253, 0.07) 34%,
            transparent 68%
          );
          opacity: 0.9;
        }

        @keyframes ab-flow-one {
          from {
            transform: translate3d(-2%, -1%, 0) rotate(-8deg) scale(1);
          }

          to {
            transform: translate3d(9%, 8%, 0) rotate(5deg) scale(1.08);
          }
        }

        @keyframes ab-flow-two {
          from {
            transform: translate3d(2%, -2%, 0) rotate(5deg) scale(1.02);
          }

          to {
            transform: translate3d(-10%, 8%, 0) rotate(-7deg) scale(0.96);
          }
        }

        @keyframes ab-flow-three {
          from {
            transform: translate3d(-4%, 3%, 0) rotate(4deg) scale(0.98);
          }

          to {
            transform: translate3d(7%, -5%, 0) rotate(-4deg) scale(1.05);
          }
        }

        :global(.dark) .ab-root {
          background: #071426;
        }

        :global(.dark) .ab-base {
          background:
            radial-gradient(
              ellipse at 50% -10%,
              rgba(30, 64, 175, 0.34) 0%,
              rgba(7, 20, 38, 0.84) 50%,
              rgba(2, 8, 23, 0.98) 100%
            ),
            #071426;
        }

        :global(.dark) .ab-aurora {
          mix-blend-mode: screen;
          opacity: 0.34;
        }

        :global(.dark) .ab-pointer-glow {
          background: radial-gradient(
            420px circle at var(--pointer-x) var(--pointer-y),
            rgba(96, 165, 250, 0.2),
            rgba(59, 130, 246, 0.08) 34%,
            transparent 68%
          );
        }

        @media (max-width: 640px) {
          .ab-aurora {
            filter: blur(48px);
            opacity: 0.42;
          }

          .ab-pointer-glow {
            background: radial-gradient(
              300px circle at var(--pointer-x) var(--pointer-y),
              rgba(96, 165, 250, 0.12),
              transparent 70%
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ab-aurora {
            animation: none !important;
          }

          .ab-pointer-glow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
