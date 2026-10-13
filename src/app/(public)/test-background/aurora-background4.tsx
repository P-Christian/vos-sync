"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Ridgeline background: layered, flowing wave ridges rolling toward you under a big sun (light)
 * or glowing planet (dark). Paper-cut depth instead of orbs, glass shapes or networks.
 * Light + dark, follows next-themes.
 *
 *   <RidgelineBackground />                      // click/tap sends a ripple through the ridges
 *   <RidgelineBackground interactive={false} />  // no interaction at all
 *
 * Layers (back to front)
 *  1. Sky gradient (warm horizon glow) painted on the canvas
 *  2. Stars (dark theme only, fade in/out with the theme)
 *  3. Sun / planet: gradient disc, soft glow and two thin halo rings
 *  4. Ridges: 20 flowing lines from horizon to the bottom. Each one hides the ones behind it,
 *     carries a gradient stroke that runs cyan -> blue -> violet -> pink from back to front,
 *     and a soft colour wash just under its crest. Front ridges are taller and glow.
 *  5. Click: a ripple travels across the surface and lifts the ridges as it passes
 *
 * One full-screen canvas, DPR capped at 1.5, one rAF loop, no sprites.
 * pointer-events: none (never blocks clicks). prefers-reduced-motion = one static frame.
 *
 * Needs next-themes (attribute="class" or "data-theme"). The canvas follows the theme with a
 * smooth crossfade; the CSS background only covers the first paint, so there is no flash.
 *
 * Tweak: ROWS, the PAL ramp (colour order), SKY_L / SKY_D (sky colours), K (per-theme strengths).
 */

const TAU = Math.PI * 2;
const ROWS = 20;
const ROWS_SMALL = 14; // phones
const WAVE_REACH = 520;
const WAVE_SECONDS = 2;

type RGB = [number, number, number];

const LIGHT = {
  cyan: [8, 145, 178],
  sky: [14, 165, 233],
  blue: [37, 99, 235],
  indigo: [79, 70, 229],
  violet: [124, 58, 237],
  pink: [219, 39, 119],
  amber: [245, 158, 11],
  white: [255, 255, 255],
} satisfies Record<string, RGB>;
type Col = keyof typeof LIGHT;

const DARK: Record<Col, RGB> = {
  cyan: [34, 211, 238],
  sky: [56, 189, 248],
  blue: [96, 165, 250],
  indigo: [129, 140, 248],
  violet: [167, 139, 250],
  pink: [244, 114, 182],
  amber: [251, 191, 36],
  white: [255, 255, 255],
};

const COLS = Object.keys(LIGHT) as Col[];

// colour ramp for the ridges, back (horizon) to front (bottom of the screen)
const PAL: Col[] = ["cyan", "sky", "blue", "indigo", "violet", "pink"];

// sky gradient stops (top, horizon, bottom)
const SKY_STOPS = [0, 0.38, 1];
const SKY_L: RGB[] = [[246, 250, 255], [255, 240, 230], [240, 242, 255]];
const SKY_D: RGB[] = [[4, 5, 14], [34, 16, 74], [8, 9, 28]];

// per-theme strengths: [light, dark]
const K = {
  wash: [0.2, 0.26], // colour wash under each crest
  line: [0.85, 0.95], // stroke alpha
  glow: [0.14, 0.2], // glow on the front ridges
  sun: [0.95, 0.92],
  halo: [0.22, 0.3],
};

interface Wave {
  x: number;
  y: number;
  t: number;
}

// first-paint fallback only (the canvas paints over it)
const CSS = `
.ridge-bg{background:linear-gradient(180deg,#F6FAFF 0%,#FFF0E6 38%,#F0F2FF 100%)}
.dark .ridge-bg,[data-theme="dark"] .ridge-bg{background:linear-gradient(180deg,#04050E 0%,#22104A 38%,#08091C 100%)}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function RidgelineBackground({ interactive = true }: { interactive?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  // theme -> shared refs (declared before the draw effect so the first frame already has the right mix)
  const targetRef = useRef(0); // 0 = light, 1 = dark
  const mixRef = useRef<number | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!resolvedTheme) return;
    const tg = resolvedTheme === "dark" ? 1 : 0;
    targetRef.current = tg;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (mixRef.current === null || reduce) {
      mixRef.current = tg; // first value, or no animation wanted: jump straight there
      redrawRef.current?.();
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv ? cv.getContext("2d") : null;
    if (!cv || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // per-row random phases, stars, click waves
    const rowPh = Array.from({ length: ROWS }, () => [Math.random() * TAU, Math.random() * TAU, Math.random() * TAU]);
    const stars = Array.from({ length: 60 }, () => ({
      fx: Math.random(),
      fy: Math.random() * 0.5,
      sz: 0.6 + Math.random() * 1.4,
      sp: 0.3 + Math.random() * 0.8,
      ph: Math.random() * TAU,
    }));
    const waves: Wave[] = [];

    // live palette, blended between light and dark every frame
    const curN = {} as Record<Col, RGB>;
    const S = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
    const ramp = (u: number): RGB => {
      const x = clamp01(u) * (PAL.length - 1);
      const i = Math.floor(x);
      const f = x - i;
      const a = curN[PAL[i]];
      const b = curN[PAL[Math.min(i + 1, PAL.length - 1)]];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    };

    let W = 0, H = 0;
    const fit = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const STEP = 10;

    const draw = (t: number) => {
      // theme mix: 0 = light, 1 = dark (eased)
      const raw = mixRef.current ?? 0;
      const mix = raw * raw * (3 - 2 * raw);
      const lp = (k: number[]) => k[0] + (k[1] - k[0]) * mix;
      for (const c of COLS) curN[c] = [0, 1, 2].map((i) => LIGHT[c][i] + (DARK[c][i] - LIGHT[c][i]) * mix) as RGB;

      const sc = Math.max(0.65, Math.min(1.35, H / 900));
      const rows = W < 700 ? ROWS_SMALL : ROWS;
      const horizon = H * 0.36;

      // 1) sky
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      SKY_STOPS.forEach((s, i) => {
        const a = SKY_L[i], b = SKY_D[i];
        bg.addColorStop(s, S([a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix, a[2] + (b[2] - a[2]) * mix], 1));
      });
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 2) stars (dark theme)
      if (mix > 0.01) {
        for (const s of stars) {
          const a = mix * (0.25 + 0.75 * Math.max(0, Math.sin(t * s.sp + s.ph)));
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.beginPath();
          ctx.arc(s.fx * W, s.fy * H, s.sz, 0, TAU);
          ctx.fill();
        }
      }

      // 3) sun / planet
      const r = Math.max(70, Math.min(W * 0.26, H * 0.22));
      const sx = W * 0.68;
      const sy = horizon * 0.92 + Math.sin(t * 0.2) * 6;
      const glow = (c: RGB, a: number) => {
        if (a < 0.005) return;
        const g = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 2.6);
        g.addColorStop(0, S(c, a));
        g.addColorStop(1, S(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 2.6, 0, TAU);
        ctx.fill();
      };
      glow(curN.amber, 0.42 * (1 - mix));
      glow(curN.pink, 0.4 * mix);
      const disc = ctx.createLinearGradient(0, sy - r, 0, sy + r);
      disc.addColorStop(0, S(curN.amber, lp(K.sun)));
      disc.addColorStop(0.55, S(curN.pink, lp(K.sun)));
      disc.addColorStop(1, S(curN.violet, lp(K.sun)));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = S(curN.white, lp(K.halo));
      ctx.beginPath();
      ctx.arc(sx, sy, r * 1.22, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = S(curN.white, lp(K.halo) * 0.6);
      ctx.beginPath();
      ctx.arc(sx, sy, r * 1.48, 0, TAU);
      ctx.stroke();

      // 4) ridges, back to front
      while (waves.length && t - waves[0].t > WAVE_SECONDS) waves.shift();
      const spacingAvg = (H * 1.02 - horizon) / rows;
      for (let i = 0; i < rows; i++) {
        const u = rows > 1 ? i / (rows - 1) : 1;
        const base = horizon + (H * 1.02 - horizon) * u ** 1.7;
        const amp = (14 + 104 * u ** 1.4) * sc;
        const ph = rowPh[i % ROWS];
        const p = new Path2D();
        let minY = base;
        for (let x = -STEP, first = true; x <= W + STEP; x += STEP) {
          const env = 0.5 + 0.5 * Math.sin(x * 0.0016 + t * 0.12 + i * 0.45);
          const wv =
            0.55 * Math.sin(x * 0.0034 + ph[0] + t * 0.32 + i * 0.3) +
            0.3 * Math.sin(x * 0.0072 - ph[1] - t * 0.24) +
            0.15 * Math.sin(x * 0.0135 + ph[2] + t * 0.4);
          let y = base + amp * wv * (0.45 + 0.55 * env);
          for (const w of waves) {
            const age = clamp01((t - w.t) / WAVE_SECONDS);
            const reach = (1 - (1 - age) ** 3) * WAVE_REACH;
            const q = Math.hypot(x - w.x, base - w.y) - reach;
            y += Math.exp(-((q / 80) ** 2)) * Math.sin(q * 0.07) * 36 * sc * (1 - age) * (0.4 + 0.6 * u);
          }
          if (y < minY) minY = y;
          if (first) {
            p.moveTo(x, y);
            first = false;
          } else p.lineTo(x, y);
        }

        // hide everything behind this ridge, then add the colour wash under the crest
        const f = new Path2D(p);
        f.lineTo(W + STEP, H + 30);
        f.lineTo(-STEP, H + 30);
        f.closePath();
        ctx.fillStyle = bg;
        ctx.fill(f);
        const col = ramp(u);
        const wash = ctx.createLinearGradient(0, minY, 0, minY + spacingAvg * 3 + 40 * sc);
        wash.addColorStop(0, S(col, lp(K.wash)));
        wash.addColorStop(1, S(col, 0));
        ctx.fillStyle = wash;
        ctx.fill(f);

        // crest line: gradient runs along the ridge, brighter and thicker towards the front
        const sg = ctx.createLinearGradient(0, 0, W, 0);
        sg.addColorStop(0, S(ramp(u - 0.16), lp(K.line) * (0.5 + 0.5 * u)));
        sg.addColorStop(0.5, S(col, lp(K.line) * (0.5 + 0.5 * u)));
        sg.addColorStop(1, S(ramp(u + 0.16), lp(K.line) * (0.5 + 0.5 * u)));
        ctx.strokeStyle = sg;
        if (u > 0.5) {
          ctx.globalAlpha = lp(K.glow) / 0.2;
          ctx.lineWidth = 6 + 6 * u;
          ctx.stroke(p);
          ctx.globalAlpha = 1;
        }
        ctx.lineWidth = 0.9 + 1.5 * u;
        ctx.stroke(p);
      }
    };

    fit();
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // glide the theme mix towards its target (~0.5 s)
      const tg = targetRef.current;
      const m = mixRef.current ?? tg;
      if (m !== tg) mixRef.current = m < tg ? Math.min(tg, m + dt * 2) : Math.max(tg, m - dt * 2);
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    };
    if (reduce) {
      redrawRef.current = () => draw(0);
      draw(0);
    } else raf = requestAnimationFrame(frame);

    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fit();
        if (reduce) draw(0);
      }, 150);
    };
    const onDown = (e: PointerEvent) => {
      waves.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000 });
      if (waves.length > 3) waves.shift();
    };
    window.addEventListener("resize", onResize);
    if (interactive && !reduce) window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      redrawRef.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [interactive]);

  return (
    <>
      <style>{CSS}</style>
      <div
        aria-hidden="true"
        className="ridge-bg"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -10,
          overflow: "hidden",
          pointerEvents: "none",
          contain: "strict",
        }}
      >
        <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
USAGE

// app/providers.tsx  (client component)  -- skip if you already have ThemeProvider (shadcn does)
"use client";
import { ThemeProvider } from "next-themes";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}

// app/layout.tsx
import { RidgelineBackground } from "@/components/ridgeline-background";
import { Providers } from "./providers";

<html lang="en" suppressHydrationWarning>
  <body>
    <Providers>
      <RidgelineBackground />
      {children}
    </Providers>
  </body>
</html>

// Frosted cards that work in both themes (Tailwind). Use a bit more opacity than usual,
// the ridges are busy near the bottom of the screen:
<div className="rounded-2xl border border-white/60 bg-white/60 p-6 shadow-[0_8px_32px_rgba(124,58,237,0.10)] backdrop-blur-xl
                dark:border-white/10 dark:bg-slate-950/50 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
  ...
</div>

Notes
- RidgelineBackground must be inside <ThemeProvider> (it calls useTheme).
- Don't put an opaque bg-* on your page wrappers, or it will cover the background.
---------------------------------------------------------------- */