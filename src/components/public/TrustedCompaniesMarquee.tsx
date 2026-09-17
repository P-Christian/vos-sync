"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface TrustedCompaniesMarqueeProps {
  companies: string[];
}

const ITEM_CLASSES =
  "text-lg sm:text-xl md:text-2xl font-bold tracking-tighter text-zinc-400 dark:text-zinc-600";

const ROW_CLASSES = "flex items-center gap-8 md:gap-16";

/**
 * Trusted-companies strip. It only scrolls when a single set of names is wider
 * than the space it sits in, so wide viewports keep a calm, centred, static row.
 * The control, hold-to-pause and scroll-to-pause behaviour mirror
 * TrustedEmployersMarquee.
 */
export function TrustedCompaniesMarquee({ companies }: TrustedCompaniesMarqueeProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPaused = isManuallyPaused || isInteracting;

  // Animate only when the names overflow the container.
  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      setShouldAnimate(content.scrollWidth > viewport.clientWidth + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [companies]);

  // Pause while the page is being scrolled, resume shortly after it stops.
  useEffect(() => {
    const handleScroll = () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      setIsInteracting(true);
      resumeTimer.current = setTimeout(() => setIsInteracting(false), 1000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const holdStart = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
    setIsInteracting(true);
  };

  const holdEnd = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setIsInteracting(false), 1000);
  };

  const items = (
    <div ref={contentRef} className={ROW_CLASSES}>
      {companies.map((company) => (
        <div key={company} className={ITEM_CLASSES}>
          {company}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <div
        ref={viewportRef}
        className="w-full overflow-hidden opacity-60 select-none"
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerCancel={holdEnd}
        onPointerLeave={holdEnd}
      >
        <div
          className={shouldAnimate ? "flex w-max animate-marquee-ltr" : "flex w-full justify-center"}
          style={isPaused ? { animationPlayState: "paused" } : undefined}
        >
          <div className={`flex items-center shrink-0 ${shouldAnimate ? "pr-8 md:pr-16" : ""}`}>
            {items}
          </div>

          {shouldAnimate && (
            <div aria-hidden="true" className="flex items-center shrink-0 pr-8 md:pr-16">
              <div className={ROW_CLASSES}>
                {companies.map((company) => (
                  <div key={company} className={ITEM_CLASSES}>
                    {company}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {shouldAnimate && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setIsManuallyPaused((paused) => !paused)}
            aria-label={
              isManuallyPaused
                ? "Resume the trusted companies marquee"
                : "Pause the trusted companies marquee"
            }
            aria-pressed={isManuallyPaused}
            className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-border bg-background/80 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
          >
            {isManuallyPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {isManuallyPaused ? "Play" : "Pause"}
          </button>
        </div>
      )}
    </div>
  );
}
