"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Calm background, light + dark. Follows your Next.js theme (next-themes) and crossfades
 * smoothly when the theme changes (toggle, or the OS switching with theme="system").
 *
 *   <CalmBackground />                 // one soft ripple on click/tap
 *   <CalmBackground ripple={false} />  // no interaction at all
 *
 * Layers (back to front)
 *  1. Four soft colour washes drifting very slowly
 *  2. A faint dot field fading out from one corner
 *  3. Two thin, translucent wave ribbons
 *  4. Six glass shapes (spheres, rings, one rounded square), low opacity
 *  5. A few gentle sparkles
 *  6. Click: one soft double ripple
 *
 * Light = pale mist blue / lavender / teal / peach on near-white.
 * Dark  = deep navy with glowing indigo / blue / teal / violet / rose.
 *
 * One full-screen canvas, sprites pre-rendered once per theme, DPR capped at 1.5, one rAF loop.
 * pointer-events: none (never blocks clicks). prefers-reduced-motion = one static frame.
 *
 * Needs next-themes with attribute="class" (the default / shadcn setup) or attribute="data-theme".
 * The page background itself is pure CSS keyed off that attribute, so there is no flash on load.
 */

const TAU = Math.PI * 2;
const RIPPLE_REACH = 200;
const RIPPLE_SECONDS = 1.6;

type RGB = [number, number, number];

// Same colour names in both themes. Light is muted pastel, dark is deeper and glowier.
const LIGHT = {
  mist: [186, 214, 243],
  sky: [125, 180, 235],
  peri: [150, 160, 235],
  lavender: [190, 175, 235],
  teal: [140, 205, 205],
  peach: [250, 210, 190],
  white: [255, 255, 255],
} satisfies Record<string, RGB>;
type Col = keyof typeof LIGHT;

const DARK: Record<Col, RGB> = {
  mist: [88, 118, 214],
  sky: [56, 152, 236],
  peri: [112, 108, 240],
  lavender: [150, 108, 236],
  teal: [36, 184, 176],
  peach: [240, 128, 158],
  white: [255, 255, 255],
};

const COLS = Object.keys(LIGHT) as Col[];
const pal = (P: Record<Col, RGB>, c: Col, a: number) => `rgba(${P[c].join(",")},${a})`;

// per-theme strengths: [light, dark]
const K = {
  wash: [1, 1.05],
  shape: [1, 0.85],
  ribbon: [1, 1.45],
  dot: [0.28, 0.42],
  edge: [0.5, 0.28],
  spark: [0.8, 1],
};

// ---- 1) washes: fx/fy = home position (fraction of screen), s = size (fraction of the long side)
const WASHES: { c: Col; fx: number; fy: number; s: number; a: number; ax: number; ay: number; sp: number }[] = [
  { c: "mist", fx: 0.15, fy: 0.2, s: 0.8, a: 0.55, ax: 0.05, ay: 0.06, sp: 0.04 },
  { c: "lavender", fx: 0.88, fy: 0.25, s: 0.7, a: 0.4, ax: 0.05, ay: 0.05, sp: 0.035 },
  { c: "teal", fx: 0.45, fy: 0.95, s: 0.8, a: 0.34, ax: 0.06, ay: 0.04, sp: 0.045 },
  { c: "peach", fx: 0.95, fy: 0.85, s: 0.5, a: 0.28, ax: 0.04, ay: 0.05, sp: 0.05 },
];

// ---- 3) ribbons: y = height fraction, a1/l1 = wave (amplitude px, wavelength px),
//         s = speed (px/s), th = thickness px, cols = colours left to right
const RIBBONS: { y: number; a1: number; l1: number; a2: number; l2: number; s: number; th: number; cols: [Col, Col, Col] }[] = [
  { y: 0.36, a1: 60, l1: 1100, a2: 20, l2: 460, s: 14, th: 110, cols: ["mist", "sky", "lavender"] },
  { y: 0.72, a1: 70, l1: 1250, a2: 24, l2: 520, s: -11, th: 140, cols: ["teal", "mist", "peri"] },
];

// ---- 4) glass shapes. size px, rs = turn speed (rad/s), a = opacity
type Kind = "sphere" | "ring" | "square";
const SHAPES: { k: Kind; c1: Col; c2: Col; size: number; fx: number; fy: number; rs: number; a: number }[] = [
  { k: "ring", c1: "sky", c2: "peri", size: 200, fx: 0.09, fy: 0.24, rs: 0.06, a: 0.6 },
  { k: "sphere", c1: "mist", c2: "sky", size: 100, fx: 0.8, fy: 0.18, rs: 0, a: 0.75 },
  { k: "square", c1: "lavender", c2: "peri", size: 110, fx: 0.9, fy: 0.58, rs: -0.07, a: 0.6 },
  { k: "sphere", c1: "peach", c2: "lavender", size: 70, fx: 0.2, fy: 0.68, rs: 0, a: 0.7 },
  { k: "ring", c1: "teal", c2: "sky", size: 110, fx: 0.62, fy: 0.78, rs: -0.08, a: 0.6 },
  { k: "sphere", c1: "white", c2: "mist", size: 54, fx: 0.4, fy: 0.15, rs: 0, a: 0.85 },
];

// ---- sprite makers (drawn once per theme, 192px) ---------------------------------------
const SP = 192;
const mkCanvas = () => {
  const c = document.createElement("canvas");
  c.width = c.height = SP;
  return c;
};

function washSprite(P: Record<Col, RGB>, c: Col) {
  const cv = mkCanvas();
  const g = cv.getContext("2d");
  if (!g) return cv;
  const gr = g.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
  gr.addColorStop(0, pal(P, c, 1));
  gr.addColorStop(0.55, pal(P, c, 0.4));
  gr.addColorStop(1, pal(P, c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, SP, SP);
  return cv;
}

function shapeSprite(P: Record<Col, RGB>, dark: boolean, k: Kind, c1: Col, c2: Col) {
  const cv = mkCanvas();
  const g = cv.getContext("2d");
  if (!g) return cv;
  g.lineJoin = "round";

  if (k === "sphere") {
    const gr = g.createRadialGradient(70, 62, 4, 96, 96, 92);
    gr.addColorStop(0, "rgba(255,255,255,.95)");
    gr.addColorStop(0.35, pal(P, c1, 0.85));
    gr.addColorStop(1, pal(P, c2, 0.9));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(96, 96, 90, 0, TAU);
    g.fill();
    g.strokeStyle = dark ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.5)";
    g.lineWidth = 2;
    g.stroke();
  } else if (k === "ring") {
    const lin = g.createLinearGradient(20, 20, 172, 172);
    lin.addColorStop(0, pal(P, c1, 0.85));
    lin.addColorStop(1, pal(P, c2, 0.85));
    g.strokeStyle = lin;
    g.lineWidth = 12;
    g.beginPath();
    g.arc(96, 96, 80, 0, TAU);
    g.stroke();
    g.strokeStyle = dark ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.6)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(96, 96, 72, 0, TAU);
    g.stroke();
  } else {
    const x = 26, y = 26, w = 140, r = 36;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + w, r);
    g.arcTo(x + w, y + w, x, y + w, r);
    g.arcTo(x, y + w, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    const gl = g.createLinearGradient(x, y, x + w, y + w);
    gl.addColorStop(0, pal(P, c1, 0.7));
    gl.addColorStop(1, pal(P, c2, 0.5));
    g.fillStyle = gl;
    g.fill();
    g.strokeStyle = dark ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.8)";
    g.lineWidth = 3;
    g.stroke();
    const hi = g.createLinearGradient(x, y, x, y + w * 0.6);
    hi.addColorStop(0, dark ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.5)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi;
    g.fill();
  }
  return cv;
}

// page background is pure CSS, keyed off the theme attribute set by next-themes (no flash on load).
// A ::before layer holds the dark gradient and fades in over the light one.
const CSS = `
.calm-bg{background:linear-gradient(170deg,#FFFFFF 0%,#F4F8FF 50%,#EEF2FB 100%)}
.calm-bg::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .6s ease;
background:linear-gradient(170deg,#080C1A 0%,#0C1226 50%,#111937 100%)}
.dark .calm-bg::before,[data-theme="dark"] .calm-bg::before{opacity:1}
@media (prefers-reduced-motion:reduce){.calm-bg::before{transition:none}}
`;

export function CalmBackground({ ripple = true }: { ripple?: boolean }) {
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

    // sprites, once, for both themes (crossfaded while the theme changes)
    const washL = new Map<Col, HTMLCanvasElement>();
    const washD = new Map<Col, HTMLCanvasElement>();
    WASHES.forEach((o) => {
      if (!washL.has(o.c)) {
        washL.set(o.c, washSprite(LIGHT, o.c));
        washD.set(o.c, washSprite(DARK, o.c));
      }
    });
    const shapeL = SHAPES.map((s) => shapeSprite(LIGHT, false, s.k, s.c1, s.c2));
    const shapeD = SHAPES.map((s) => shapeSprite(DARK, true, s.k, s.c1, s.c2));

    // per-element random seeds
    const washPh = WASHES.map(() => Math.random() * TAU);
    const shPh = SHAPES.map(() => ({
      a: Math.random() * TAU,
      b: Math.random() * TAU,
      f1: 0.08 + Math.random() * 0.08,
      f2: 0.07 + Math.random() * 0.08,
      ax: 0.02 + Math.random() * 0.025,
      ay: 0.02 + Math.random() * 0.025,
      rot: Math.random() * TAU,
    }));
    const ribPh = RIBBONS.map(() => [Math.random() * 1000, Math.random() * 1000]);
    const sparks = Array.from({ length: 10 }, () => ({
      fx: Math.random(),
      fy: Math.random(),
      sz: 4 + Math.random() * 6,
      sp: 0.25 + Math.random() * 0.4,
      ph: Math.random() * TAU,
    }));
    const pulses: { x: number; y: number; t: number }[] = [];

    // live palette, blended between light and dark every frame
    const cur = {} as Record<Col, string>;
    const rg = (c: Col, a: number) => `rgba(${cur[c]},${a})`;

    let W = 0, H = 0;
    let cy = new Float32Array(0), ht = new Float32Array(0);
    const fit = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const STEP = 14;
    const GRID = 32;

    const draw = (t: number, dt: number) => {
      // theme mix: 0 = light, 1 = dark (eased)
      const raw = mixRef.current ?? 0;
      const mix = raw * raw * (3 - 2 * raw);
      const lp = (k: number[]) => k[0] + (k[1] - k[0]) * mix;
      for (const c of COLS) cur[c] = LIGHT[c].map((v, i) => Math.round(v + (DARK[c][i] - v) * mix)).join(",");

      ctx.clearRect(0, 0, W, H);
      const sc = Math.max(0.6, Math.min(1.3, H / 900));
      const big = Math.max(W, H);

      // 1) washes
      const wl = 1 - mix;
      WASHES.forEach((o, i) => {
        const x = o.fx * W + Math.sin(t * o.sp + washPh[i]) * o.ax * W;
        const y = o.fy * H + Math.cos(t * o.sp * 0.8 + washPh[i] * 1.3) * o.ay * H;
        const s = o.s * big;
        const base = o.a * (0.85 + 0.15 * Math.sin(t * 0.2 + washPh[i]));
        if (wl > 0.001) {
          ctx.globalAlpha = Math.min(1, base * wl * K.wash[0]);
          ctx.drawImage(washL.get(o.c) as HTMLCanvasElement, x - s / 2, y - s / 2, s, s);
        }
        if (mix > 0.001) {
          ctx.globalAlpha = Math.min(1, base * mix * K.wash[1]);
          ctx.drawImage(washD.get(o.c) as HTMLCanvasElement, x - s / 2, y - s / 2, s, s);
        }
      });
      ctx.globalAlpha = 1;

      // 2) faint dot field, top-right corner, fading outwards
      const reach = big * 0.38;
      ctx.beginPath();
      for (let y = GRID / 2; y < H; y += GRID) {
        if (y > reach) break;
        for (let x = GRID / 2; x < W; x += GRID) {
          const d = Math.hypot(x - W, y);
          const w = 1 - d / reach;
          if (w <= 0.05) continue;
          const r = 2.4 * w * (0.7 + 0.3 * Math.sin(d * 0.015 - t * 0.6));
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
      }
      ctx.fillStyle = rg("sky", lp(K.dot));
      ctx.fill();

      // 3) ribbons
      const n = Math.ceil(W / STEP) + 2;
      if (cy.length < n) {
        cy = new Float32Array(n);
        ht = new Float32Array(n);
      }
      const rm = lp(K.ribbon);
      RIBBONS.forEach((r, i) => {
        ribPh[i][0] += dt * r.s;
        ribPh[i][1] -= dt * r.s * 0.6;
        const base = r.y * H;
        for (let k = 0; k < n; k++) {
          const x = k * STEP;
          cy[k] = base + sc * (r.a1 * Math.sin(((x + ribPh[i][0]) / r.l1) * TAU) + r.a2 * Math.sin(((x + ribPh[i][1]) / r.l2) * TAU));
          ht[k] = (sc * r.th * (0.7 + 0.3 * Math.sin(x * 0.003 + t * 0.15 + i * 2))) / 2;
        }
        const sx = -W * 0.25 + W * 0.25 * Math.sin(t * 0.05 + i * 2);
        const g = ctx.createLinearGradient(sx, 0, sx + W * 1.3, 0);
        g.addColorStop(0, rg(r.cols[0], 0.3 * rm));
        g.addColorStop(0.5, rg(r.cols[1], 0.34 * rm));
        g.addColorStop(1, rg(r.cols[2], 0.3 * rm));
        ctx.beginPath();
        for (let q = 0; q < n; q++) {
          const x = q * STEP, y = cy[q] - ht[q];
          if (q) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        for (let q = n - 1; q >= 0; q--) ctx.lineTo(q * STEP, cy[q] + ht[q]);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        for (let q = 0; q < n; q++) {
          const x = q * STEP, y = cy[q] - ht[q];
          if (q) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${lp(K.edge)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // 4) glass shapes
      SHAPES.forEach((s, i) => {
        const p = shPh[i];
        p.rot += dt * s.rs;
        const x = s.fx * W + Math.sin(t * p.f1 + p.a) * p.ax * W;
        const y = s.fy * H + Math.cos(t * p.f2 + p.b) * p.ay * H;
        const size = s.size * sc * (1 + 0.03 * Math.sin(t * 0.4 + p.b));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        if (wl > 0.001) {
          ctx.globalAlpha = s.a * wl * K.shape[0];
          ctx.drawImage(shapeL[i], -size / 2, -size / 2, size, size);
        }
        if (mix > 0.001) {
          ctx.globalAlpha = s.a * mix * K.shape[1];
          ctx.drawImage(shapeD[i], -size / 2, -size / 2, size, size);
        }
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      // 5) sparkles
      ctx.lineWidth = 1.2;
      const sm = lp(K.spark);
      for (const s of sparks) {
        const a = Math.max(0, Math.sin(t * s.sp + s.ph)) ** 3 * sm;
        if (a < 0.04) continue;
        const x = s.fx * W;
        const y = s.fy * H;
        const L = s.sz * (0.5 + 0.5 * a);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.moveTo(x - L, y);
        ctx.lineTo(x + L, y);
        ctx.moveTo(x, y - L);
        ctx.lineTo(x, y + L);
        ctx.stroke();
      }

      // 6) click: one soft double ripple
      while (pulses.length && t - pulses[0].t > RIPPLE_SECONDS) pulses.shift();
      for (const pu of pulses) {
        const age = Math.min(1, Math.max(0, (t - pu.t) / RIPPLE_SECONDS));
        const e = 1 - (1 - age) ** 3;
        const fade = 1 - age;
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = rg("sky", fade * (0.55 + 0.25 * mix));
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${fade * (0.8 - 0.3 * mix)})`;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH * 0.6, 0, TAU);
        ctx.stroke();
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
      draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    };
    if (reduce) {
      redrawRef.current = () => draw(0, 0);
      draw(0, 0);
    } else raf = requestAnimationFrame(frame);

    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fit();
        if (reduce) draw(0, 0);
      }, 150);
    };
    const onDown = (e: PointerEvent) => {
      pulses.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000 });
      if (pulses.length > 2) pulses.shift();
    };
    window.addEventListener("resize", onResize);
    if (ripple && !reduce) window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      redrawRef.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [ripple]);

  return (
    <>
      <style>{CSS}</style>
      <div
        aria-hidden="true"
        className="calm-bg"
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
import { CalmBackground } from "@/components/calm-background";
import { Providers } from "./providers";

<html lang="en" suppressHydrationWarning>
  <body>
    <Providers>
      <CalmBackground />
      {children}
    </Providers>
  </body>
</html>

// Frosted cards that work in both themes (Tailwind):
<div className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-[0_8px_32px_rgba(99,120,180,0.08)] backdrop-blur-xl
                dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
  ...
</div>

Notes
- CalmBackground must be inside <ThemeProvider> (it calls useTheme).
- Don't put an opaque bg-* on your page wrappers, or it will cover the background.
- If you use attribute="data-theme" instead of "class", it already works (CSS handles both).
---------------------------------------------------------------- */