"use client";

import { useEffect, useRef } from "react";

/**
 * Constellation background (blue + white) with a click ripple.
 *
 *   <ConstellationBackground />                 // dots + lines, ripple on click/tap
 *   <ConstellationBackground ripple={false} />  // no interaction at all
 *
 *  - Dots drift on their own; each heading turns slowly, so direction and speed change
 *    smoothly (no jumps). A few dots are glowing stars that twinkle.
 *  - No mouse-move or hover effects. The only interaction is a ripple ring that spreads
 *    from the point you click or tap.
 *  - One full-screen canvas, soft glow pre-rendered once, link lines batched into 3 strokes,
 *    DPR capped at 1.5, one rAF loop (the browser pauses it when the tab is hidden).
 *  - pointer-events: none, so it never blocks clicks. prefers-reduced-motion = one static frame.
 */

const TAU = Math.PI * 2;
const RIPPLE_REACH = 220; // how far the ripple ring spreads (px)
const RIPPLE_SECONDS = 1.2; // how long it takes to spread and fade
const LINK = 140; // max distance between two dots that get joined by a line
const ALPHAS = [0.1, 0.18, 0.28]; // line opacity: far, medium, near

type Dot = { x: number; y: number; ang: number; ph: number; sp: number; r: number; star: boolean };

export function ConstellationBackground({ ripple = true }: { ripple?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv ? cv.getContext("2d") : null;
    if (!cv || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // soft glow for the twinkling stars, drawn once
    const glow = document.createElement("canvas");
    glow.width = glow.height = 48;
    const gg = glow.getContext("2d");
    if (gg) {
      const g = gg.createRadialGradient(24, 24, 0, 24, 24, 24);
      g.addColorStop(0, "rgba(255,255,255,.95)");
      g.addColorStop(0.35, "rgba(147,197,253,.5)");
      g.addColorStop(1, "rgba(59,130,246,0)");
      gg.fillStyle = g;
      gg.fillRect(0, 0, 48, 48);
    }

    let W = 0;
    let H = 0;
    let dots: Dot[] = [];
    const pulses: { x: number; y: number; t: number }[] = [];

    const build = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(30, Math.min(110, Math.round((W * H) / 17000)));
      dots = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        ang: Math.random() * TAU,
        ph: Math.random() * TAU,
        sp: 6 + Math.random() * 12,
        r: 1.4 + Math.random() * 1.8,
        star: i % 7 === 0,
      }));
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, W, H);

      for (const d of dots) {
        d.ang += Math.sin(t * 0.2 + d.ph) * 0.6 * dt; // heading turns slowly and smoothly
        d.x += Math.cos(d.ang) * d.sp * dt;
        d.y += Math.sin(d.ang) * d.sp * dt;
        if (d.x < -20) d.x = W + 20;
        else if (d.x > W + 20) d.x = -20;
        if (d.y < -20) d.y = H + 20;
        else if (d.y > H + 20) d.y = -20;
      }

      // links, batched into 3 alpha buckets (3 strokes instead of hundreds)
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      const n = dots.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = dots[i].x - dots[j].x;
          if (dx > LINK || dx < -LINK) continue;
          const dy = dots[i].y - dots[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const a = 1 - Math.sqrt(d2) / LINK;
            const path = paths[a > 0.66 ? 2 : a > 0.33 ? 1 : 0];
            path.moveTo(dots[i].x, dots[i].y);
            path.lineTo(dots[j].x, dots[j].y);
          }
        }
      }
      ctx.lineWidth = 1;
      paths.forEach((path, b) => {
        ctx.strokeStyle = `rgba(37,99,235,${ALPHAS[b]})`;
        ctx.stroke(path);
      });

      // dots
      ctx.beginPath();
      for (const d of dots) {
        if (!d.star) {
          ctx.moveTo(d.x + d.r, d.y);
          ctx.arc(d.x, d.y, d.r, 0, TAU);
        }
      }
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.strokeStyle = "rgba(59,130,246,.5)";
      ctx.fill();
      ctx.stroke();

      // glowing stars that twinkle
      for (const d of dots) {
        if (d.star) {
          const s = 14 + d.r * 5;
          ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.8 + d.ph);
          ctx.drawImage(glow, d.x - s, d.y - s, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;

      // click ripples
      ctx.lineWidth = 1.5;
      while (pulses.length && t - pulses[0].t > RIPPLE_SECONDS) pulses.shift();
      for (const pu of pulses) {
        const age = (t - pu.t) / RIPPLE_SECONDS;
        const e = 1 - (1 - age) ** 3; // spreads fast, then slows
        ctx.strokeStyle = `rgba(59,130,246,${((1 - age) * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${((1 - age) * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH * 0.72, 0, TAU);
        ctx.stroke();
      }
    };

    build();
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    };
    if (reduce) draw(0, 0);
    else raf = requestAnimationFrame(frame);

    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        build();
        if (reduce) draw(0, 0);
      }, 150);
    };
    const onDown = (e: PointerEvent) => {
      pulses.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000 });
      if (pulses.length > 3) pulses.shift();
    };

    window.addEventListener("resize", onResize);
    if (ripple && !reduce) window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [ripple]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -10,
        overflow: "hidden",
        pointerEvents: "none",
        contain: "strict",
        background:
          "radial-gradient(ellipse at 50% 35%,rgba(255,255,255,.75),rgba(255,255,255,0) 65%),linear-gradient(160deg,#F2F7FF 0%,#D9E8FF 100%)",
      }}
    >
      <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

/* ---------------------------------------------------------------
USAGE

// app/layout.tsx
import { ConstellationBackground } from "@/components/constellation-background";

<body>
  <ConstellationBackground />
  {children}
</body>

// Blurred cards on top (Tailwind). Works on shadcn <Card className="..."> too:
<div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150">
  ...
</div>

Note: don't put an opaque bg-* on your page wrappers, or it will cover the background.
---------------------------------------------------------------- */