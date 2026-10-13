"use client";

import { useEffect, useRef } from "react";

/**
 * Vivid POP background: same engine as VividBackground, but louder, more graphic, full colour.
 *
 *   <VividPopBackground />                 // ripple + confetti burst on click/tap
 *   <VividPopBackground ripple={false} />  // no interaction at all
 *
 * Layers (back to front)
 *  1. Nine colour orbs (cyan, pink, amber, violet, teal, coral ...) drifting slowly
 *  2. Two rotating sunbursts (warm top-right, cool bottom-left)
 *  3. Halftone dots in all four corners, each corner its own colour, pulsing outward
 *  4. Breathing concentric rings
 *  5. Five rainbow silk ribbons whose colours travel along them
 *  6. Wavy squiggle lines
 *  7. Glass shapes: sphere, ring, rounded square, triangle, star, hexagon, plus, pill, crescent
 *  8. Rising confetti (dots, bars, triangles)
 *  9. Multi-coloured twinkling sparkles
 * 10. Click: rainbow triple ripple + a burst of dots and little stars
 *
 * Motion is smooth: speeds are accumulated phases, so they swell and ease without jumping.
 * One full-screen canvas, every shape is a sprite pre-rendered once, DPR capped at 1.5,
 * one rAF loop. pointer-events: none (never blocks clicks).
 * prefers-reduced-motion = one static frame.
 *
 * Want a different mood? Edit PALETTE, ORBS, RIBBONS, SHAPES and the CSS background below.
 */

const TAU = Math.PI * 2;
const RIPPLE_REACH = 260;
const RIPPLE_SECONDS = 1.4;

// "r,g,b" strings so they can go straight into rgba()
const PALETTE = {
  sky: "56,189,248",
  cyan: "34,211,238",
  teal: "45,212,191",
  mint: "52,211,153",
  lime: "163,230,53",
  amber: "251,191,36",
  orange: "251,146,60",
  coral: "251,113,133",
  pink: "244,114,182",
  magenta: "217,70,239",
  violet: "139,92,246",
  indigo: "99,102,241",
  blue: "59,130,246",
  royal: "37,99,235",
  white: "255,255,255",
};
type Col = keyof typeof PALETTE;
const rgba = (c: Col, a: number) => `rgba(${PALETTE[c]},${a})`;

const RAINBOW: Col[] = ["cyan", "sky", "blue", "violet", "magenta", "pink", "coral", "orange", "amber", "lime", "teal"];

// ---- 1) orbs: fx/fy = home position (fraction of screen), s = size (fraction of the long side)
const ORBS: { c: Col; fx: number; fy: number; s: number; a: number; ax: number; ay: number; sp: number }[] = [
  { c: "cyan", fx: 0.12, fy: 0.18, s: 0.7, a: 0.5, ax: 0.06, ay: 0.08, sp: 0.07 },
  { c: "pink", fx: 0.88, fy: 0.2, s: 0.65, a: 0.42, ax: 0.07, ay: 0.06, sp: 0.05 },
  { c: "amber", fx: 0.72, fy: 0.55, s: 0.5, a: 0.32, ax: 0.06, ay: 0.07, sp: 0.06 },
  { c: "violet", fx: 0.08, fy: 0.85, s: 0.6, a: 0.38, ax: 0.05, ay: 0.06, sp: 0.09 },
  { c: "sky", fx: 0.5, fy: 0.92, s: 0.85, a: 0.45, ax: 0.08, ay: 0.05, sp: 0.06 },
  { c: "coral", fx: 0.3, fy: 0.45, s: 0.45, a: 0.28, ax: 0.07, ay: 0.07, sp: 0.08 },
  { c: "teal", fx: 0.95, fy: 0.85, s: 0.55, a: 0.38, ax: 0.05, ay: 0.07, sp: 0.07 },
  { c: "magenta", fx: 0.45, fy: 0.05, s: 0.5, a: 0.26, ax: 0.08, ay: 0.05, sp: 0.05 },
  { c: "white", fx: 0.58, fy: 0.4, s: 0.55, a: 0.8, ax: 0.09, ay: 0.07, sp: 0.04 },
];

// ---- 3) halftone corners: x/y = corner (0 or 1)
const HALFTONES: { x: 0 | 1; y: 0 | 1; c: Col; a: number }[] = [
  { x: 1, y: 0, c: "orange", a: 0.34 },
  { x: 0, y: 1, c: "blue", a: 0.3 },
  { x: 0, y: 0, c: "pink", a: 0.3 },
  { x: 1, y: 1, c: "teal", a: 0.3 },
];

// ---- 5) ribbons: y = height fraction, a1/l1 + a2/l2 = two waves (amplitude px, wavelength px),
//         s = speed (px/s, negative = other direction), th = thickness px, cols = colours left to right
const RIBBONS: { y: number; a1: number; l1: number; a2: number; l2: number; s: number; th: number; cols: Col[] }[] = [
  { y: 0.22, a1: 60, l1: 850, a2: 26, l2: 360, s: 24, th: 100, cols: ["pink", "orange", "amber"] },
  { y: 0.4, a1: 80, l1: 1000, a2: 34, l2: 420, s: -20, th: 140, cols: ["cyan", "blue", "violet", "magenta"] },
  { y: 0.58, a1: 90, l1: 1150, a2: 40, l2: 460, s: 16, th: 170, cols: ["lime", "teal", "sky", "royal"] },
  { y: 0.76, a1: 64, l1: 800, a2: 28, l2: 330, s: -28, th: 120, cols: ["violet", "pink", "coral"] },
  { y: 0.92, a1: 50, l1: 700, a2: 22, l2: 300, s: 30, th: 90, cols: ["amber", "lime", "cyan"] },
];

// ---- 7) glass shapes. size px, rs = turn speed (rad/s, 0 = no turn), a = opacity
type Kind = "sphere" | "ring" | "square" | "tri" | "star" | "hex" | "plus" | "pill" | "moon";
const SHAPES: { k: Kind; c1: Col; c2: Col; size: number; fx: number; fy: number; rs: number; a: number }[] = [
  { k: "ring", c1: "sky", c2: "indigo", size: 220, fx: 0.08, fy: 0.22, rs: 0.12, a: 0.85 },
  { k: "sphere", c1: "cyan", c2: "blue", size: 110, fx: 0.78, fy: 0.16, rs: 0, a: 0.95 },
  { k: "square", c1: "pink", c2: "violet", size: 130, fx: 0.88, fy: 0.55, rs: -0.15, a: 0.9 },
  { k: "tri", c1: "amber", c2: "coral", size: 120, fx: 0.3, fy: 0.12, rs: 0.18, a: 0.92 },
  { k: "sphere", c1: "magenta", c2: "violet", size: 80, fx: 0.18, fy: 0.62, rs: 0, a: 0.92 },
  { k: "ring", c1: "lime", c2: "teal", size: 130, fx: 0.62, fy: 0.7, rs: -0.2, a: 0.9 },
  { k: "star", c1: "amber", c2: "orange", size: 130, fx: 0.42, fy: 0.45, rs: 0.22, a: 0.95 },
  { k: "sphere", c1: "orange", c2: "coral", size: 150, fx: 0.7, fy: 0.9, rs: 0, a: 0.9 },
  { k: "tri", c1: "teal", c2: "cyan", size: 90, fx: 0.05, fy: 0.88, rs: -0.25, a: 0.9 },
  { k: "ring", c1: "white", c2: "pink", size: 74, fx: 0.52, fy: 0.08, rs: 0.3, a: 0.95 },
  { k: "sphere", c1: "white", c2: "sky", size: 50, fx: 0.34, fy: 0.78, rs: 0, a: 0.95 },
  { k: "square", c1: "teal", c2: "mint", size: 62, fx: 0.95, fy: 0.35, rs: 0.28, a: 0.88 },
  { k: "hex", c1: "violet", c2: "blue", size: 150, fx: 0.9, fy: 0.9, rs: 0.1, a: 0.85 },
  { k: "star", c1: "pink", c2: "magenta", size: 70, fx: 0.58, fy: 0.3, rs: -0.35, a: 0.92 },
  { k: "plus", c1: "cyan", c2: "sky", size: 80, fx: 0.24, fy: 0.36, rs: 0.2, a: 0.9 },
  { k: "pill", c1: "coral", c2: "pink", size: 150, fx: 0.15, fy: 0.78, rs: -0.12, a: 0.88 },
  { k: "moon", c1: "amber", c2: "lime", size: 110, fx: 0.82, fy: 0.72, rs: 0.14, a: 0.9 },
  { k: "hex", c1: "lime", c2: "teal", size: 66, fx: 0.46, fy: 0.62, rs: -0.3, a: 0.9 },
  { k: "plus", c1: "orange", c2: "amber", size: 60, fx: 0.68, fy: 0.12, rs: 0.26, a: 0.92 },
  { k: "pill", c1: "indigo", c2: "violet", size: 110, fx: 0.38, fy: 0.9, rs: 0.16, a: 0.85 },
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

function poly(g: CanvasRenderingContext2D, pts: [number, number][]) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

function shapeSprite(k: Kind, c1: Col, c2: Col) {
  const cv = mkCanvas();
  const g = cv.getContext("2d");
  if (!g) return cv;
  const lin = g.createLinearGradient(20, 20, 172, 172);
  lin.addColorStop(0, rgba(c1, 0.92));
  lin.addColorStop(1, rgba(c2, 0.92));
  g.lineJoin = "round";
  g.lineCap = "round";

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
    gl.addColorStop(0, rgba(c1, 0.78));
    gl.addColorStop(1, rgba(c2, 0.58));
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
  } else if (k === "tri") {
    poly(g, [[96, 22], [170, 150], [22, 150]]);
    const gl = g.createLinearGradient(22, 22, 170, 150);
    gl.addColorStop(0, rgba(c1, 0.82));
    gl.addColorStop(1, rgba(c2, 0.62));
    g.fillStyle = gl;
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.stroke();
  } else if (k === "star") {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 86 : 40;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([96 + Math.cos(a) * r, 98 + Math.sin(a) * r]);
    }
    poly(g, pts);
    const gl = g.createLinearGradient(20, 20, 172, 172);
    gl.addColorStop(0, rgba(c1, 0.95));
    gl.addColorStop(1, rgba(c2, 0.85));
    g.fillStyle = gl;
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.stroke();
  } else if (k === "hex") {
    const outer: [number, number][] = [];
    const inner: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      outer.push([96 + Math.cos(a) * 84, 96 + Math.sin(a) * 84]);
      inner.push([96 + Math.cos(a) * 52, 96 + Math.sin(a) * 52]);
    }
    poly(g, outer);
    const gl = g.createLinearGradient(20, 20, 172, 172);
    gl.addColorStop(0, rgba(c1, 0.8));
    gl.addColorStop(1, rgba(c2, 0.6));
    g.fillStyle = gl;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "rgba(255,255,255,.85)";
    g.stroke();
    poly(g, inner);
    g.lineWidth = 2;
    g.strokeStyle = "rgba(255,255,255,.6)";
    g.stroke();
  } else if (k === "plus") {
    const a = 26, L = 78;
    poly(g, [
      [96 - a, 96 - L], [96 + a, 96 - L], [96 + a, 96 - a], [96 + L, 96 - a],
      [96 + L, 96 + a], [96 + a, 96 + a], [96 + a, 96 + L], [96 - a, 96 + L],
      [96 - a, 96 + a], [96 - L, 96 + a], [96 - L, 96 - a], [96 - a, 96 - a],
    ]);
    const gl = g.createLinearGradient(20, 20, 172, 172);
    gl.addColorStop(0, rgba(c1, 0.92));
    gl.addColorStop(1, rgba(c2, 0.82));
    g.fillStyle = gl;
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = gl;
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = "rgba(255,255,255,.8)";
    g.stroke();
  } else if (k === "pill") {
    const w = 168, h = 64, x = 96 - w / 2, y = 96 - h / 2, r = h / 2;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    const gl = g.createLinearGradient(x, y, x + w, y + h);
    gl.addColorStop(0, rgba(c1, 0.9));
    gl.addColorStop(1, rgba(c2, 0.85));
    g.fillStyle = gl;
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.8)";
    g.lineWidth = 3;
    g.stroke();
    const hi = g.createLinearGradient(0, y, 0, y + h * 0.55);
    hi.addColorStop(0, "rgba(255,255,255,.6)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi;
    g.fill();
  } else {
    // moon (crescent)
    const gl = g.createLinearGradient(20, 20, 172, 172);
    gl.addColorStop(0, rgba(c1, 0.95));
    gl.addColorStop(1, rgba(c2, 0.9));
    g.fillStyle = gl;
    g.beginPath();
    g.arc(96, 96, 82, 0, TAU);
    g.fill();
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(128, 80, 66, 0, TAU);
    g.fill();
    g.globalCompositeOperation = "source-over";
  }
  return cv;
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, L: number, stroke: string) {
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(x - L, y);
  ctx.lineTo(x + L, y);
  ctx.moveTo(x, y - L);
  ctx.lineTo(x, y + L);
  ctx.stroke();
}

export function VividPopBackground({ ripple = true }: { ripple?: boolean }) {
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
    const shPh = SHAPES.map(() => ({
      a: Math.random() * TAU,
      b: Math.random() * TAU,
      f1: 0.12 + Math.random() * 0.14,
      f2: 0.1 + Math.random() * 0.14,
      ax: 0.025 + Math.random() * 0.04,
      ay: 0.025 + Math.random() * 0.04,
      rot: Math.random() * TAU,
    }));
    const ribPh = RIBBONS.map(() => [Math.random() * 1000, Math.random() * 1000]);
    const sparks = Array.from({ length: 36 }, () => ({
      fx: Math.random(),
      fy: Math.random(),
      sz: 5 + Math.random() * 10,
      sp: 0.35 + Math.random() * 0.6,
      ph: Math.random() * TAU,
      c: Math.random() < 0.35 ? ("white" as Col) : RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    }));
    const confetti = Array.from({ length: 46 }, () => ({
      fx: Math.random(),
      fy: Math.random(),
      sz: 5 + Math.random() * 9,
      sp: 0.012 + Math.random() * 0.025,
      sway: 10 + Math.random() * 30,
      ph: Math.random() * TAU,
      rot: Math.random() * TAU,
      rs: (Math.random() - 0.5) * 2,
      kind: Math.floor(Math.random() * 3),
      c: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    }));
    const pulses: { x: number; y: number; t: number; ci: number }[] = [];
    let clicks = 0;

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

    const sunburst = (cx: number, cyy: number, R: number, c: Col, a: number, rot: number) => {
      const N = 18;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a0 = rot + (i / N) * TAU;
        const a1 = a0 + (TAU / N) * 0.45;
        ctx.moveTo(cx, cyy);
        ctx.arc(cx, cyy, R, a0, a1);
        ctx.closePath();
      }
      const g = ctx.createRadialGradient(cx, cyy, 0, cx, cyy, R);
      g.addColorStop(0, rgba(c, a));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fill();
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, W, H);
      const sc = Math.max(0.6, Math.min(1.4, H / 900));
      const big = Math.max(W, H);

      // 1) orbs
      ORBS.forEach((o, i) => {
        const x = o.fx * W + Math.sin(t * o.sp + orbPh[i]) * o.ax * W;
        const y = o.fy * H + Math.cos(t * o.sp * 0.8 + orbPh[i] * 1.3) * o.ay * H;
        const s = o.s * big;
        ctx.globalAlpha = o.a * (0.8 + 0.2 * Math.sin(t * 0.3 + orbPh[i]));
        ctx.drawImage(orbSpr.get(o.c) as HTMLCanvasElement, x - s / 2, y - s / 2, s, s);
      });
      ctx.globalAlpha = 1;

      // 2) sunbursts
      sunburst(W * 0.9, H * 0.08, big * 0.55, "amber", 0.3, t * 0.035);
      sunburst(W * 0.08, H * 0.92, big * 0.5, "violet", 0.24, -t * 0.03);

      // 3) halftone corners: dots swell and shrink in waves travelling outwards
      const reach = big * 0.4;
      for (const h of HALFTONES) {
        const cx = h.x * W;
        const cyy = h.y * H;
        ctx.beginPath();
        for (let y = HALF / 2; y < H; y += HALF) {
          if (Math.abs(y - cyy) > reach) continue;
          for (let x = HALF / 2; x < W; x += HALF) {
            const dm = Math.hypot(x - cx, y - cyy);
            const w = 1 - dm / reach;
            if (w <= 0.03) continue;
            const r = 4.6 * w * (0.55 + 0.45 * Math.sin(dm * 0.02 - t * 1.2 + h.x * 2 + h.y));
            if (r < 0.6) continue;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, TAU);
          }
        }
        ctx.fillStyle = rgba(h.c, h.a);
        ctx.fill();
      }

      // 4) concentric rings, breathing
      const rings = (fx: number, fy: number, cols: Col[]) => {
        ctx.lineWidth = 2.5;
        for (let k = 0; k < 6; k++) {
          const r = (k + 1) * 36 * sc * (1 + 0.07 * Math.sin(t * 0.8 - k * 0.6));
          ctx.strokeStyle = rgba(cols[k % cols.length], 0.45 - k * 0.05);
          ctx.beginPath();
          ctx.arc(fx, fy, r, 0, TAU);
          ctx.stroke();
        }
      };
      rings(W * 0.2 + Math.sin(t * 0.1) * 20, H * 0.5, ["teal", "cyan", "sky"]);
      rings(W * 0.82 + Math.cos(t * 0.1) * 20, H * 0.34, ["pink", "magenta", "coral"]);

      // 5) ribbons
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
        const band = (mul: number, a: number) => {
          const g = ctx.createLinearGradient(sx, 0, sx + W * 1.3, 0);
          r.cols.forEach((c, ci) => g.addColorStop(ci / (r.cols.length - 1), rgba(c, a)));
          ctx.beginPath();
          for (let q = 0; q < n; q++) {
            const x = q * STEP, y = cy[q] - ht[q] * mul;
            if (q) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          for (let q = n - 1; q >= 0; q--) ctx.lineTo(q * STEP, cy[q] + ht[q] * mul);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
        };
        const edge = (mul: number, stroke: string) => {
          ctx.beginPath();
          for (let q = 0; q < n; q++) {
            const x = q * STEP, y = cy[q] + ht[q] * mul;
            if (q) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        };
        band(1, 0.42); // outer silk
        band(0.4, 0.5); // brighter core
        edge(-1, "rgba(255,255,255,.65)");
        edge(1, "rgba(255,255,255,.28)");
      });

      // 6) squiggles
      const squig = (x0: number, y0: number, len: number, amp: number, wl: number, ph: number, c1: Col, c2: Col) => {
        const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
        g.addColorStop(0, rgba(c1, 0.9));
        g.addColorStop(1, rgba(c2, 0.9));
        ctx.strokeStyle = g;
        ctx.lineWidth = 6 * sc;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let x = 0; x <= len; x += 8) {
          const y = y0 + Math.sin(((x + ph) / wl) * TAU) * amp;
          if (x) ctx.lineTo(x0 + x, y);
          else ctx.moveTo(x0 + x, y);
        }
        ctx.stroke();
        ctx.lineCap = "butt";
      };
      squig(W * 0.06, H * 0.46, 220 * sc, 14 * sc, 70 * sc, t * 40, "pink", "orange");
      squig(W * 0.72, H * 0.8, 260 * sc, 16 * sc, 80 * sc, -t * 36, "cyan", "violet");
      squig(W * 0.4, H * 0.04, 200 * sc, 12 * sc, 60 * sc, t * 32, "lime", "teal");

      // 7) glass shapes
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

      // 8) confetti rising slowly
      for (const f of confetti) {
        f.rot += dt * f.rs;
        const prog = (f.fy + t * f.sp) % 1;
        const y = H + 20 - prog * (H + 40);
        const x = f.fx * W + Math.sin(t * 0.5 + f.ph) * f.sway;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = Math.sin(prog * Math.PI) * 0.85;
        ctx.fillStyle = rgba(f.c, 1);
        if (f.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, f.sz * 0.45, 0, TAU);
          ctx.fill();
        } else if (f.kind === 1) {
          ctx.fillRect(-f.sz * 0.7, -f.sz * 0.2, f.sz * 1.4, f.sz * 0.4);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -f.sz * 0.6);
          ctx.lineTo(f.sz * 0.55, f.sz * 0.4);
          ctx.lineTo(-f.sz * 0.55, f.sz * 0.4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 9) sparkles
      ctx.lineWidth = 1.5;
      for (const s of sparks) {
        const a = Math.max(0, Math.sin(t * s.sp + s.ph)) ** 3;
        if (a < 0.04) continue;
        const x = s.fx * W;
        const y = s.fy * H;
        const L = s.sz * (0.5 + 0.5 * a);
        sparkle(ctx, x, y, L, rgba(s.c, a));
        ctx.fillStyle = rgba("white", a * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, TAU);
        ctx.fill();
      }

      // 10) click ripples + confetti burst
      while (pulses.length && t - pulses[0].t > RIPPLE_SECONDS) pulses.shift();
      for (const pu of pulses) {
        const age = Math.min(1, Math.max(0, (t - pu.t) / RIPPLE_SECONDS));
        const e = 1 - (1 - age) ** 3;
        const fade = 1 - age;
        const ringAt = (k: number, c: Col, a: number) => {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = rgba(c, fade * a);
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, e * RIPPLE_REACH * k, 0, TAU);
          ctx.stroke();
        };
        ringAt(1, RAINBOW[pu.ci % RAINBOW.length], 0.8);
        ringAt(0.74, RAINBOW[(pu.ci + 3) % RAINBOW.length], 0.65);
        ringAt(0.48, "white", 0.95);
        for (let k = 0; k < 16; k++) {
          const ang = (k / 16) * TAU + 0.3 + pu.ci * 0.4;
          const d = e * RIPPLE_REACH * (k % 2 ? 1.1 : 0.85);
          const px = pu.x + Math.cos(ang) * d;
          const py = pu.y + Math.sin(ang) * d;
          const c = RAINBOW[(k + pu.ci) % RAINBOW.length];
          if (k % 4 === 0) {
            ctx.lineWidth = 2;
            sparkle(ctx, px, py, 7 * fade + 1, rgba(c, fade));
          } else {
            ctx.fillStyle = rgba(c, fade * 0.95);
            ctx.beginPath();
            ctx.arc(px, py, 3.4 * fade + 0.6, 0, TAU);
            ctx.fill();
          }
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
      pulses.push({ x: e.clientX, y: e.clientY, t: performance.now() / 1000, ci: clicks++ });
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
        background: "linear-gradient(160deg,#FFFFFF 0%,#FFF0F8 26%,#EAF3FF 58%,#E6F8F0 100%)",
      }}
    >
      <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

/* ---------------------------------------------------------------
USAGE

// app/layout.tsx
import { VividPopBackground } from "@/components/vivid-background-pop";

<body>
  <VividPopBackground />
  {children}
</body>

// Frosted cards on top (Tailwind). Works on shadcn <Card className="..."> too:
<div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_rgba(139,92,246,0.12)] backdrop-blur-xl backdrop-saturate-150">
  ...
</div>

Note: don't put an opaque bg-* on your page wrappers, or it will cover the background.
---------------------------------------------------------------- */