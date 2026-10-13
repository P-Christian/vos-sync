"use client";

import { useEffect, useRef } from "react";

/**
 * Vivid background: a graphic, colourful composition that stays blue-led.
 *
 *   <VividBackground />                 // ripple + sparks on click/tap
 *   <VividBackground ripple={false} />  // no interaction at all
 *
 * Layers (back to front)
 *  1. Big colour orbs (cyan, sky, indigo, violet, blue + a white one) drifting slowly
 *  2. Halftone dots in two corners, pulsing outward in waves
 *  3. Three layered silk ribbons whose colours travel along them
 *  4. Glass shapes: spheres, rings, rounded squares, triangles (drifting + turning)
 *  5. Twinkling sparkles
 *  6. Click: coloured double ripple + a burst of small sparks
 *
 * Motion is smooth: speeds are accumulated phases, so they swell and ease without jumping.
 * No mouse-move effects, only the click. One full-screen canvas, every shape is a sprite
 * pre-rendered once, DPR capped at 1.5, one rAF loop. pointer-events: none (never blocks
 * clicks). prefers-reduced-motion = one static frame.
 *
 * Want a different mood? Edit PALETTE, ORBS, RIBBONS and SHAPES below.
 */

const TAU = Math.PI * 2;
const RIPPLE_REACH = 240;
const RIPPLE_SECONDS = 1.3;

// "r,g,b" strings so they can go straight into rgba()
const PALETTE = {
  sky: "56,189,248",
  cyan: "34,211,238",
  blue: "59,130,246",
  royal: "37,99,235",
  indigo: "99,102,241",
  violet: "139,92,246",
  white: "255,255,255",
};
type Col = keyof typeof PALETTE;
const rgba = (c: Col, a: number) => `rgba(${PALETTE[c]},${a})`;

// ---- 1) orbs: fx/fy = home position (fraction of screen), s = size (fraction of the long side)
const ORBS: { c: Col; fx: number; fy: number; s: number; a: number; ax: number; ay: number; sp: number }[] = [
  { c: "cyan", fx: 0.15, fy: 0.2, s: 0.75, a: 0.5, ax: 0.06, ay: 0.08, sp: 0.07 },
  { c: "indigo", fx: 0.85, fy: 0.25, s: 0.7, a: 0.42, ax: 0.07, ay: 0.06, sp: 0.05 },
  { c: "sky", fx: 0.5, fy: 0.88, s: 0.85, a: 0.5, ax: 0.08, ay: 0.05, sp: 0.06 },
  { c: "violet", fx: 0.08, fy: 0.85, s: 0.55, a: 0.3, ax: 0.05, ay: 0.06, sp: 0.09 },
  { c: "white", fx: 0.6, fy: 0.4, s: 0.55, a: 0.85, ax: 0.09, ay: 0.07, sp: 0.04 },
  { c: "blue", fx: 0.92, fy: 0.82, s: 0.6, a: 0.38, ax: 0.05, ay: 0.07, sp: 0.08 },
];

// ---- 3) ribbons: y = height fraction, a1/l1 + a2/l2 = two waves (amplitude px, wavelength px),
//         s = speed (px/s, negative = other direction), th = thickness px, cols = colours left to right
const RIBBONS: { y: number; a1: number; l1: number; a2: number; l2: number; s: number; th: number; cols: [Col, Col, Col] }[] = [
  { y: 0.3, a1: 70, l1: 900, a2: 30, l2: 380, s: 22, th: 130, cols: ["cyan", "blue", "indigo"] },
  { y: 0.56, a1: 90, l1: 1100, a2: 40, l2: 450, s: -18, th: 170, cols: ["sky", "royal", "violet"] },
  { y: 0.8, a1: 60, l1: 800, a2: 25, l2: 330, s: 28, th: 110, cols: ["blue", "cyan", "white"] },
];

// ---- 4) glass shapes. size px, rs = turn speed (rad/s, 0 = no turn), a = opacity
type Kind = "sphere" | "ring" | "square" | "tri";
const SHAPES: { k: Kind; c1: Col; c2: Col; size: number; fx: number; fy: number; rs: number; a: number }[] = [
  { k: "ring", c1: "sky", c2: "indigo", size: 220, fx: 0.08, fy: 0.22, rs: 0.12, a: 0.85 },
  { k: "sphere", c1: "cyan", c2: "blue", size: 110, fx: 0.78, fy: 0.16, rs: 0, a: 0.95 },
  { k: "square", c1: "blue", c2: "violet", size: 130, fx: 0.88, fy: 0.55, rs: -0.15, a: 0.9 },
  { k: "tri", c1: "sky", c2: "blue", size: 120, fx: 0.3, fy: 0.12, rs: 0.18, a: 0.9 },
  { k: "sphere", c1: "indigo", c2: "violet", size: 80, fx: 0.18, fy: 0.62, rs: 0, a: 0.9 },
  { k: "ring", c1: "cyan", c2: "blue", size: 120, fx: 0.62, fy: 0.7, rs: -0.2, a: 0.9 },
  { k: "square", c1: "sky", c2: "cyan", size: 90, fx: 0.42, fy: 0.45, rs: 0.22, a: 0.85 },
  { k: "sphere", c1: "blue", c2: "royal", size: 150, fx: 0.7, fy: 0.9, rs: 0, a: 0.9 },
  { k: "tri", c1: "indigo", c2: "violet", size: 90, fx: 0.05, fy: 0.88, rs: -0.25, a: 0.9 },
  { k: "ring", c1: "white", c2: "sky", size: 70, fx: 0.52, fy: 0.08, rs: 0.3, a: 0.95 },
  { k: "sphere", c1: "white", c2: "sky", size: 50, fx: 0.34, fy: 0.78, rs: 0, a: 0.95 },
  { k: "square", c1: "indigo", c2: "blue", size: 60, fx: 0.95, fy: 0.35, rs: 0.28, a: 0.85 },
  { k: "ring", c1: "violet", c2: "indigo", size: 150, fx: 0.9, fy: 0.9, rs: 0.1, a: 0.8 },
  { k: "tri", c1: "cyan", c2: "sky", size: 56, fx: 0.58, fy: 0.3, rs: 0.35, a: 0.9 },
];

// ---- sprite makers (drawn once, 192px) -------------------------------------------------
const SP = 192;
const mkCanvas = () => {
  const c = document.createElement("canvas");
  c.width = c.height = SP;
  return c;
};

function orbSprite(c: Col) {
  const cv = mkCanvas();
  const g = cv.getContext("2d");
  if (!g) return cv;
  const gr = g.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
  gr.addColorStop(0, rgba(c, 1));
  gr.addColorStop(0.5, rgba(c, 0.45));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, SP, SP);
  return cv;
}

function shapeSprite(k: Kind, c1: Col, c2: Col) {
  const cv = mkCanvas();
  const g = cv.getContext("2d");
  if (!g) return cv;
  const lin = g.createLinearGradient(20, 20, 172, 172);
  lin.addColorStop(0, rgba(c1, 0.9));
  lin.addColorStop(1, rgba(c2, 0.9));
  g.lineJoin = "round";

  if (k === "sphere") {
    const gr = g.createRadialGradient(70, 62, 4, 96, 96, 92);
    gr.addColorStop(0, "rgba(255,255,255,.98)");
    gr.addColorStop(0.28, rgba(c1, 0.95));
    gr.addColorStop(1, rgba(c2, 0.98));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(96, 96, 90, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.45)";
    g.lineWidth = 2;
    g.stroke();
  } else if (k === "ring") {
    g.strokeStyle = lin;
    g.lineWidth = 20;
    g.beginPath();
    g.arc(96, 96, 78, 0, TAU);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.7)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(96, 96, 66, 0, TAU);
    g.stroke();
  } else if (k === "square") {
    const x = 26, y = 26, w = 140, r = 30;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + w, r);
    g.arcTo(x + w, y + w, x, y + w, r);
    g.arcTo(x, y + w, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    const gl = g.createLinearGradient(x, y, x + w, y + w);
    gl.addColorStop(0, rgba(c1, 0.75));
    gl.addColorStop(1, rgba(c2, 0.55));
    g.fillStyle = gl;
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.lineWidth = 3;
    g.stroke();
    const hi = g.createLinearGradient(x, y, x, y + w * 0.6);
    hi.addColorStop(0, "rgba(255,255,255,.55)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi;
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(96, 22);
    g.lineTo(170, 150);
    g.lineTo(22, 150);
    g.closePath();
    const gl = g.createLinearGradient(22, 22, 170, 150);
    gl.addColorStop(0, rgba(c1, 0.8));
    gl.addColorStop(1, rgba(c2, 0.6));
    g.fillStyle = gl;
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.stroke();
  }
  return cv;
}

export function VividBackground({ ripple = true }: { ripple?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv ? cv.getContext("2d") : null;
    if (!cv || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // sprites, once
    const orbSpr = new Map<Col, HTMLCanvasElement>();
    ORBS.forEach((o) => {
      if (!orbSpr.has(o.c)) orbSpr.set(o.c, orbSprite(o.c));
    });
    const shapeSpr = SHAPES.map((s) => shapeSprite(s.k, s.c1, s.c2));

    // per-element random seeds (kept as fractions, so a resize needs no rebuild)
    const rnd = (n: number) => Array.from({ length: n }, () => Math.random() * TAU);
    const orbPh = rnd(ORBS.length);
    const shPh = SHAPES.map(() => ({ a: Math.random() * TAU, b: Math.random() * TAU, f1: 0.12 + Math.random() * 0.14, f2: 0.1 + Math.random() * 0.14, ax: 0.025 + Math.random() * 0.04, ay: 0.025 + Math.random() * 0.04, rot: Math.random() * TAU }));
    const ribPh = RIBBONS.map(() => [Math.random() * 1000, Math.random() * 1000]);
    const sparks = Array.from({ length: 24 }, () => ({ fx: Math.random(), fy: Math.random(), sz: 5 + Math.random() * 9, sp: 0.35 + Math.random() * 0.6, ph: Math.random() * TAU, blue: Math.random() < 0.4 }));
    const pulses: { x: number; y: number; t: number }[] = [];
    const BURST = [PALETTE.cyan, PALETTE.blue, PALETTE.indigo, PALETTE.violet, PALETTE.sky];

    let W = 0, H = 0;
    let cy = new Float32Array(0), ht = new Float32Array(0);
    const fit = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const STEP = 12;
    const HALF = 28; // halftone spacing
    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, W, H);
      const sc = Math.max(0.6, Math.min(1.4, H / 900));

      // 1) orbs
      const big = Math.max(W, H);
      ORBS.forEach((o, i) => {
        const x = o.fx * W + Math.sin(t * o.sp + orbPh[i]) * o.ax * W;
        const y = o.fy * H + Math.cos(t * o.sp * 0.8 + orbPh[i] * 1.3) * o.ay * H;
        const s = o.s * big;
        ctx.globalAlpha = o.a * (0.8 + 0.2 * Math.sin(t * 0.3 + orbPh[i]));
        ctx.drawImage(orbSpr.get(o.c) as HTMLCanvasElement, x - s / 2, y - s / 2, s, s);
      });
      ctx.globalAlpha = 1;

      // 2) halftone corners: dots swell and shrink in waves travelling outwards
      const reach = big * 0.45;
      ctx.beginPath();
      for (let y = HALF / 2; y < H; y += HALF) {
        for (let x = HALF / 2; x < W; x += HALF) {
          const dm = Math.min(Math.hypot(x - W, y), Math.hypot(x, y - H));
          const w = 1 - dm / reach;
          if (w <= 0.03) continue;
          const r = 4.6 * w * (0.55 + 0.45 * Math.sin(dm * 0.02 - t * 1.2));
          if (r < 0.6) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
      }
      ctx.fillStyle = rgba("blue", 0.3);
      ctx.fill();

      // 3) ribbons
      const n = Math.ceil(W / STEP) + 2;
      if (cy.length < n) {
        cy = new Float32Array(n);
        ht = new Float32Array(n);
      }
      RIBBONS.forEach((r, i) => {
        ribPh[i][0] += dt * r.s * (1 + 0.4 * Math.sin(t * 0.15 + i));
        ribPh[i][1] -= dt * r.s * 0.7 * (1 + 0.3 * Math.cos(t * 0.11 + i));
        const base = r.y * H;
        for (let k = 0; k < n; k++) {
          const x = k * STEP;
          cy[k] = base + sc * (r.a1 * Math.sin(((x + ribPh[i][0]) / r.l1) * TAU) + r.a2 * Math.sin(((x + ribPh[i][1]) / r.l2) * TAU));
          ht[k] = (sc * r.th * (0.65 + 0.35 * Math.sin(x * 0.004 + t * 0.2 + i * 2))) / 2;
        }
        const sx = -W * 0.3 + W * 0.3 * Math.sin(t * 0.07 + i * 2); // colours slide along the ribbon
        const band = (k: number, from: number, to: number, a: number) => {
          const g = ctx.createLinearGradient(sx, 0, sx + W * 1.3, 0);
          g.addColorStop(0, rgba(r.cols[0], a));
          g.addColorStop(0.5, rgba(r.cols[1], a));
          g.addColorStop(1, rgba(r.cols[2], a));
          ctx.beginPath();
          for (let q = 0; q < n; q++) (q ? ctx.lineTo : ctx.moveTo).call(ctx, q * STEP, cy[q] - ht[q] * from);
          for (let q = n - 1; q >= 0; q--) ctx.lineTo(q * STEP, cy[q] + ht[q] * to);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
          return k;
        };
        band(0, 1, 1, 0.42); // outer silk
        band(1, 0.4, 0.4, 0.5); // brighter core
        ctx.beginPath();
        for (let q = 0; q < n; q++) (q ? ctx.lineTo : ctx.moveTo).call(ctx, q * STEP, cy[q] - ht[q]);
        ctx.strokeStyle = "rgba(255,255,255,.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        for (let q = 0; q < n; q++) (q ? ctx.lineTo : ctx.moveTo).call(ctx, q * STEP, cy[q] + ht[q]);
        ctx.strokeStyle = "rgba(255,255,255,.25)";
        ctx.stroke();
      });

      // 4) glass shapes
      SHAPES.forEach((s, i) => {
        const p = shPh[i];
        p.rot += dt * s.rs * (1 + 0.5 * Math.sin(t * 0.2 + p.a)); // turn speed breathes
        const x = s.fx * W + Math.sin(t * p.f1 + p.a) * p.ax * W;
        const y = s.fy * H + Math.cos(t * p.f2 + p.b) * p.ay * H;
        const size = s.size * sc * (1 + 0.05 * Math.sin(t * 0.5 + p.b));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = s.a;
        ctx.drawImage(shapeSpr[i], -size / 2, -size / 2, size, size);
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      // 5) sparkles
      ctx.lineWidth = 1.5;
      for (const s of sparks) {
        const a = Math.max(0, Math.sin(t * s.sp + s.ph)) ** 3;
        if (a < 0.04) continue;
        const x = s.fx * W;
        const y = s.fy * H;
        const L = s.sz * (0.5 + 0.5 * a);
        ctx.strokeStyle = s.blue ? rgba("sky", a) : rgba("white", a);
        ctx.beginPath();
        ctx.moveTo(x - L, y);
        ctx.lineTo(x + L, y);
        ctx.moveTo(x, y - L);
        ctx.lineTo(x, y + L);
        ctx.stroke();
        ctx.fillStyle = rgba("white", a * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, TAU);
        ctx.fill();
      }

      // 6) click ripples + spark burst
      while (pulses.length && t - pulses[0].t > RIPPLE_SECONDS) pulses.shift();
      for (const pu of pulses) {
        const age = (t - pu.t) / RIPPLE_SECONDS;
        const e = 1 - (1 - age) ** 3;
        const fade = 1 - age;
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba("cyan", fade * 0.7);
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = rgba("indigo", fade * 0.55);
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH * 0.72, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = rgba("white", fade * 0.9);
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, e * RIPPLE_REACH * 0.45, 0, TAU);
        ctx.stroke();
        for (let k = 0; k < 10; k++) {
          const ang = (k / 10) * TAU + 0.3;
          const d = e * RIPPLE_REACH * 1.05;
          ctx.fillStyle = `rgba(${BURST[k % BURST.length]},${(fade * 0.9).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(pu.x + Math.cos(ang) * d, pu.y + Math.sin(ang) * d, 3.2 * fade + 0.6, 0, TAU);
          ctx.fill();
        }
      }
    };

    fit();
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
        fit();
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
        background: "linear-gradient(170deg,#FFFFFF 0%,#EAF3FF 45%,#DCE6FF 100%)",
      }}
    >
      <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

/* ---------------------------------------------------------------
USAGE

// app/layout.tsx
import { VividBackground } from "@/components/vivid-background";

<body>
  <VividBackground />
  {children}
</body>

// Frosted cards on top (Tailwind). Works on shadcn <Card className="..."> too:
<div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150">
  ...
</div>

Note: don't put an opaque bg-* on your page wrappers, or it will cover the background.
---------------------------------------------------------------- */