"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { AuroraBackground } from "./aurora-background";

/**
 * Four more blue + white backgrounds, plus a selector that also includes the aurora.
 *
 *   <BlueBackground variant="waves" />          // layered ocean waves
 *   <BlueBackground variant="bubbles" />        // glass bubbles rising
 *   <BlueBackground variant="constellation" />  // dots + lines
 *   <BlueBackground variant="mesh" />           // gradient mesh + grid + light beams
 *   <BlueBackground variant="aurora" />         // the one from aurora-background.tsx
 *   <BlueBackground variant="waves" interactive={false} />  // no mouse reaction
 *
 * Shared rules
 *  - Motion is always on and independent of the mouse. Speed and direction change
 *    smoothly (accumulated phases / slowly turning headings / sampled curves), never in jumps.
 *  - The mouse only affects the area within RADIUS px of the cursor, and effects fade in and
 *    out smoothly (no popping when the cursor enters or leaves).
 *  - Canvas variants: one full-screen canvas, pre-rendered sprites, DPR capped at 1.5, one
 *    rAF loop (paused by the browser when the tab is hidden). Mesh variant: CSS transforms only.
 *  - pointer-events: none, so it never blocks clicks. prefers-reduced-motion = one static frame.
 */

export type BackgroundVariant = "aurora" | "waves" | "bubbles" | "constellation" | "mesh";

const RADIUS = 170; // reach of the mouse effect (px)
const TAU = Math.PI * 2;

type V = CSSProperties & Record<`--${string}`, string | number>;

// =====================================================================================
// Shared canvas scene runner
// =====================================================================================
type Size = { W: number; H: number };
type Pointer = { x: number; y: number; sx: number; sy: number; k: number; active: boolean };
type Scene = { draw: (t: number, dt: number) => void; click?: (x: number, y: number) => void };
type Build = (ctx: CanvasRenderingContext2D, size: Size, p: Pointer) => Scene;

function useScene(build: Build, interactive: boolean) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv ? cv.getContext("2d") : null;
    if (!cv || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const size: Size = { W: 0, H: 0 };
    const p: Pointer = { x: 0, y: 0, sx: 0, sy: 0, k: 0, active: false };

    const fit = () => {
      size.W = window.innerWidth;
      size.H = window.innerHeight;
      cv.width = Math.round(size.W * dpr);
      cv.height = Math.round(size.H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    let scene = build(ctx, size, p);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (p.active) {
        p.sx += (p.x - p.sx) * 0.18; // smoothed cursor
        p.sy += (p.y - p.sy) * 0.18;
      }
      p.k += ((p.active ? 1 : 0) - p.k) * Math.min(1, dt * 6); // smooth fade in/out of effects
      ctx.clearRect(0, 0, size.W, size.H);
      scene.draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    };
    if (reduce) scene.draw(0, 0);
    else raf = requestAnimationFrame(frame);

    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fit();
        scene = build(ctx, size, p);
        if (reduce) scene.draw(0, 0);
      }, 150);
    };
    const onMove = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.active) {
        p.active = true;
        p.sx = p.x; // appear under the cursor instead of flying in
        p.sy = p.y;
      }
    };
    const onLeave = () => {
      p.active = false;
    };
    const onDown = (e: PointerEvent) => scene.click?.(e.clientX, e.clientY);
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") onLeave();
    };

    window.addEventListener("resize", onResize);
    const live = interactive && !reduce;
    if (live) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onLeave, { passive: true });
      window.addEventListener("blur", onLeave);
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [build, interactive]);

  return ref;
}

const ROOT_CSS = `
.bb-root{position:fixed;inset:0;z-index:-10;overflow:hidden;pointer-events:none;contain:strict}
.bb-canvas{position:absolute;inset:0;width:100%;height:100%}
`;

function CanvasBackground({ build, bg, interactive }: { build: Build; bg: string; interactive: boolean }) {
  const ref = useScene(build, interactive);
  return (
    <div className="bb-root" style={{ background: bg }} aria-hidden="true">
      <style>{ROOT_CSS}</style>
      <canvas ref={ref} className="bb-canvas" />
    </div>
  );
}

// =====================================================================================
// 1) WAVES: five layered waves. The cursor lifts the nearby waves into a rippling bump;
//    a click sends a splash travelling along the water.
// =====================================================================================
const buildWaves: Build = (ctx, size, p) => {
  const L = [
    { y: 0.58, a: 26, l1: 520, l2: 290, s1: 14, s2: -22, c: "191,219,254", al: 0.55 },
    { y: 0.66, a: 30, l1: 640, l2: 340, s1: -18, s2: 26, c: "147,197,253", al: 0.5 },
    { y: 0.75, a: 28, l1: 480, l2: 260, s1: 24, s2: -16, c: "96,165,250", al: 0.42 },
    { y: 0.84, a: 24, l1: 700, l2: 380, s1: -12, s2: 20, c: "59,130,246", al: 0.34 },
    { y: 0.93, a: 20, l1: 560, l2: 300, s1: 18, s2: -14, c: "255,255,255", al: 0.8 },
  ];
  const ph = L.map(() => [Math.random() * 500, Math.random() * 500]);
  const STEP = 10;
  const n = Math.ceil(size.W / STEP) + 2;
  const ys = new Float32Array(n);
  const SIG = RADIUS * 0.55;
  const splashes: { x: number; t: number }[] = [];
  let tNow = 0;

  return {
    click: (x) => {
      splashes.push({ x, t: tNow });
      if (splashes.length > 4) splashes.shift();
    },
    draw: (t, dt) => {
      tNow = t;
      const H = size.H;
      L.forEach((w, i) => {
        // phase is accumulated, so speed can swell and ease without ever jumping
        ph[i][0] += dt * w.s1 * (1 + 0.35 * Math.sin(t * 0.17 + i * 1.3));
        ph[i][1] += dt * w.s2 * (1 + 0.3 * Math.cos(t * 0.13 + i));
        const base = w.y * H;
        const amp = w.a * (1 + 0.2 * Math.sin(t * 0.2 + i));
        const prox = p.k > 0.01 ? Math.max(0, 1 - Math.abs(p.sy - base) / (RADIUS * 2.4)) : 0;

        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let k = 0; k < n; k++) {
          const x = k * STEP;
          let y = base + amp * (0.6 * Math.sin(((x + ph[i][0]) / w.l1) * TAU) + 0.4 * Math.sin(((x + ph[i][1]) / w.l2) * TAU));
          if (prox > 0) {
            const dx = x - p.sx;
            y -= prox * p.k * 46 * Math.exp(-(dx * dx) / (2 * SIG * SIG)) * (0.55 + 0.45 * Math.cos(dx / 16 - t * 5));
          }
          for (const s of splashes) {
            const age = t - s.t;
            if (age < 3) {
              const d = Math.abs(x - s.x) - 260 * age;
              y -= 24 * Math.exp(-(d * d) / (2 * 70 * 70)) * Math.exp(-age * 1.1) * Math.sin(d / 22);
            }
          }
          ys[k] = y;
          ctx.lineTo(x, y);
        }
        ctx.lineTo((n - 1) * STEP, H);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, base - amp - 20, 0, H);
        g.addColorStop(0, `rgba(${w.c},${w.al})`);
        g.addColorStop(1, `rgba(${w.c},${(w.al * 0.6).toFixed(2)})`);
        ctx.fillStyle = g;
        ctx.fill();

        if (i < L.length - 1) {
          ctx.beginPath();
          ctx.moveTo(0, ys[0]);
          for (let k = 1; k < n; k++) ctx.lineTo(k * STEP, ys[k]);
          ctx.strokeStyle = `rgba(255,255,255,${0.35 + i * 0.08})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    },
  };
};

export function WavesBackground({ interactive = true }: { interactive?: boolean }) {
  return (
    <CanvasBackground
      build={buildWaves}
      interactive={interactive}
      bg="linear-gradient(180deg,#FFFFFF 0%,#EEF5FF 45%,#D4E5FF 100%)"
    />
  );
}

// =====================================================================================
// 2) BUBBLES: glassy bubbles rise and sway. Near the cursor they drift aside and swell;
//    click/tap pops the ones around it (they respawn from the bottom).
// =====================================================================================
type Bub = { x0: number; y: number; r: number; vy: number; sw: number; ph: number; amp: number; a: number; ox: number; oy: number; pop: number; px: number; py: number };

const buildBubbles: Build = (ctx, size, p) => {
  const spr = document.createElement("canvas");
  spr.width = spr.height = 128;
  const sg = spr.getContext("2d");
  if (sg) {
    const body = sg.createRadialGradient(64, 64, 30, 64, 64, 62);
    body.addColorStop(0, "rgba(255,255,255,.03)");
    body.addColorStop(0.75, "rgba(191,219,254,.14)");
    body.addColorStop(0.93, "rgba(147,197,253,.6)");
    body.addColorStop(1, "rgba(255,255,255,0)");
    sg.fillStyle = body;
    sg.fillRect(0, 0, 128, 128);
    const hi = sg.createRadialGradient(44, 40, 0, 44, 40, 22);
    hi.addColorStop(0, "rgba(255,255,255,.95)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    sg.fillStyle = hi;
    sg.fillRect(0, 0, 128, 128);
    const lo = sg.createRadialGradient(88, 94, 0, 88, 94, 28);
    lo.addColorStop(0, "rgba(96,165,250,.3)");
    lo.addColorStop(1, "rgba(96,165,250,0)");
    sg.fillStyle = lo;
    sg.fillRect(0, 0, 128, 128);
  }

  const { W, H } = size;
  const mk = (anywhere: boolean): Bub => {
    const r = 10 + Math.random() ** 1.6 * 62;
    return {
      x0: Math.random() * W, y: anywhere ? Math.random() * H : H + r * 2 + Math.random() * H * 0.3,
      r, vy: 8 + r * 0.32, sw: 0.25 + Math.random() * 0.35, ph: Math.random() * TAU,
      amp: 10 + Math.random() * 30, a: 0.4 + 0.5 * (r / 72), ox: 0, oy: 0, pop: -1, px: 0, py: 0,
    };
  };
  const bubbles = Array.from({ length: Math.max(14, Math.min(32, Math.round(W / 55))) }, () => mk(true));

  return {
    click: (cx, cy) => {
      let popped = 0;
      for (const b of bubbles) {
        if (b.pop < 0 && popped < 6 && Math.hypot(b.px - cx, b.py - cy) < RADIUS * 1.1) {
          b.pop = 0;
          popped++;
        }
      }
    },
    draw: (t, dt) => {
      for (const b of bubbles) {
        b.y -= b.vy * (1 + 0.3 * Math.sin(t * 0.3 + b.ph)) * dt; // rise speed breathes smoothly
        if (b.pop >= 0) {
          b.pop += dt / 0.3;
          if (b.pop >= 1) {
            Object.assign(b, mk(false));
            continue;
          }
        } else if (b.y < -b.r * 2) {
          Object.assign(b, mk(false));
          continue;
        }
        const x = b.x0 + Math.sin(t * b.sw + b.ph) * b.amp;
        let tx = 0, ty = 0, sc = 1;
        if (p.k > 0.01 && b.pop < 0) {
          const dx = x - p.sx;
          const dy = b.y - p.sy;
          const d = Math.hypot(dx, dy);
          const reach = RADIUS + b.r;
          if (d < reach) {
            const f = (1 - d / reach) ** 2;
            tx = (dx / (d || 1)) * f * 70 * p.k;
            ty = (dy / (d || 1)) * f * 70 * p.k;
            sc = 1 + f * 0.12;
          }
        }
        b.ox += (tx - b.ox) * 0.08;
        b.oy += (ty - b.oy) * 0.08;
        b.px = x + b.ox;
        b.py = b.y + b.oy;
        if (b.pop < 0) {
          const s = b.r * sc;
          ctx.globalAlpha = b.a;
          ctx.drawImage(spr, b.px - s, b.py - s, s * 2, s * 2);
        } else {
          const q = b.pop;
          const s = b.r * (1 + q * 0.5);
          ctx.globalAlpha = b.a * (1 - q);
          ctx.drawImage(spr, b.px - s, b.py - s, s * 2, s * 2);
          ctx.globalAlpha = (1 - q) * 0.8;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(b.px, b.py, b.r * (1 + q * 1.1), 0, TAU);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
};

export function BubblesBackground({ interactive = true }: { interactive?: boolean }) {
  return (
    <CanvasBackground
      build={buildBubbles}
      interactive={interactive}
      bg="linear-gradient(180deg,#F6FAFF 0%,#DCEBFF 55%,#B9D6FF 100%)"
    />
  );
}

// =====================================================================================
// 3) CONSTELLATION: drifting dots joined by thin lines. Headings turn slowly (smooth curves).
//    The cursor becomes a node: nearby dots connect to it and are nudged aside. Click = pulse.
// =====================================================================================
const buildStars: Build = (ctx, size, p) => {
  const { W, H } = size;
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

  const n = Math.max(30, Math.min(110, Math.round((W * H) / 17000)));
  const nodes = Array.from({ length: n }, (_, i) => ({
    x: Math.random() * W, y: Math.random() * H, ang: Math.random() * TAU, ph: Math.random() * TAU,
    sp: 6 + Math.random() * 12, r: 1.4 + Math.random() * 1.8, star: i % 7 === 0, ox: 0, oy: 0, px: 0, py: 0,
  }));
  const LINK = 140;
  const ALPHAS = [0.1, 0.18, 0.28];
  const pulses: { x: number; y: number; t: number }[] = [];
  let tNow = 0;

  return {
    click: (x, y) => {
      pulses.push({ x, y, t: tNow });
      if (pulses.length > 3) pulses.shift();
    },
    draw: (t, dt) => {
      tNow = t;
      for (const d of nodes) {
        d.ang += Math.sin(t * 0.2 + d.ph) * 0.6 * dt; // heading turns slowly and smoothly
        d.x += Math.cos(d.ang) * d.sp * dt;
        d.y += Math.sin(d.ang) * d.sp * dt;
        if (d.x < -20) d.x = W + 20;
        else if (d.x > W + 20) d.x = -20;
        if (d.y < -20) d.y = H + 20;
        else if (d.y > H + 20) d.y = -20;
        let tx = 0, ty = 0;
        if (p.k > 0.01) {
          const dx = d.x - p.sx;
          const dy = d.y - p.sy;
          const dist = Math.hypot(dx, dy);
          if (dist < RADIUS) {
            const f = (1 - dist / RADIUS) ** 2;
            tx = (dx / (dist || 1)) * f * 50 * p.k;
            ty = (dy / (dist || 1)) * f * 50 * p.k;
          }
        }
        d.ox += (tx - d.ox) * 0.08;
        d.oy += (ty - d.oy) * 0.08;
        d.px = d.x + d.ox;
        d.py = d.y + d.oy;
      }

      // links, batched into 3 alpha buckets (3 strokes instead of hundreds)
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = nodes[i].px - nodes[j].px;
          if (dx > LINK || dx < -LINK) continue;
          const dy = nodes[i].py - nodes[j].py;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const a = 1 - Math.sqrt(d2) / LINK;
            const path = paths[a > 0.66 ? 2 : a > 0.33 ? 1 : 0];
            path.moveTo(nodes[i].px, nodes[i].py);
            path.lineTo(nodes[j].px, nodes[j].py);
          }
        }
      }
      ctx.lineWidth = 1;
      paths.forEach((path, b) => {
        ctx.strokeStyle = `rgba(37,99,235,${ALPHAS[b]})`;
        ctx.stroke(path);
      });

      // cursor links
      if (p.k > 0.01) {
        const reach = RADIUS * 1.35;
        ctx.lineWidth = 1.2;
        for (const d of nodes) {
          const dist = Math.hypot(d.px - p.sx, d.py - p.sy);
          if (dist < reach) {
            ctx.strokeStyle = `rgba(37,99,235,${((1 - dist / reach) * 0.55 * p.k).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p.sx, p.sy);
            ctx.lineTo(d.px, d.py);
            ctx.stroke();
          }
        }
      }

      // dots
      ctx.beginPath();
      for (const d of nodes) {
        if (!d.star) {
          ctx.moveTo(d.px + d.r, d.py);
          ctx.arc(d.px, d.py, d.r, 0, TAU);
        }
      }
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.strokeStyle = "rgba(59,130,246,.5)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // glowing "stars" that twinkle
      for (const d of nodes) {
        if (d.star) {
          const s = 14 + d.r * 5;
          ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.8 + d.ph);
          ctx.drawImage(glow, d.px - s, d.py - s, s * 2, s * 2);
        }
      }
      if (p.k > 0.01) {
        ctx.globalAlpha = 0.85 * p.k;
        ctx.drawImage(glow, p.sx - 20, p.sy - 20, 40, 40);
      }
      ctx.globalAlpha = 1;

      // click pulses
      ctx.lineWidth = 1.5;
      for (const pu of pulses) {
        const age = (t - pu.t) / 1.2;
        if (age < 1) {
          const e = 1 - (1 - age) ** 3;
          ctx.strokeStyle = `rgba(59,130,246,${((1 - age) * 0.5).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, e * RADIUS * 1.3, 0, TAU);
          ctx.stroke();
        }
      }
    },
  };
};

export function ConstellationBackground({ interactive = true }: { interactive?: boolean }) {
  return (
    <CanvasBackground
      build={buildStars}
      interactive={interactive}
      bg="radial-gradient(ellipse at 50% 35%,rgba(255,255,255,.75),rgba(255,255,255,0) 65%),linear-gradient(160deg,#F2F7FF 0%,#D9E8FF 100%)"
    />
  );
}

// =====================================================================================
// 4) MESH: slow gradient mesh + faint grid + soft light beams (CSS transforms only).
//    The cursor lights up the grid lines in a small spot around it.
// =====================================================================================
type Wv = [number, number, number];
const sum = (ws: Wv[], u: number) => ws.reduce((a, [n, m, ph]) => a + m * Math.sin(TAU * n * u + ph), 0);
const kf = (name: string, f: (u: number) => string, steps = 30) => {
  let out = "";
  for (let j = 0; j <= steps; j++) out += `${((j / steps) * 100).toFixed(2)}%{transform:${f(j / steps)}}`;
  return `@keyframes ${name}{${out}}`;
};

const MESH_PATHS: { x: Wv[]; y: Wv[]; s: Wv[] }[] = [
  { x: [[1, 10, 0], [2, 3, 1]], y: [[1, 8, 1.2], [3, 2, 0.4]], s: [[1, 0.1, 0.5], [2, 0.04, 1.4]] },
  { x: [[1, 12, 2], [3, 2, 0.5]], y: [[2, 6, 0.3], [1, 6, 2.2]], s: [[2, 0.09, 0], [1, 0.06, 2]] },
  { x: [[2, 8, 1], [1, 9, 3]], y: [[1, 10, 0.5], [2, 3, 2]], s: [[1, 0.1, 1], [3, 0.03, 0.4]] },
];
const MESH_KF =
  MESH_PATHS.map((m, i) =>
    kf(`mb-d${i + 1}`, (u) => `translate3d(calc(${sum(m.x, u).toFixed(2)}vw * var(--k,1)),calc(${sum(m.y, u).toFixed(2)}vh * var(--k,1)),0) scale(${(1 + sum(m.s, u)).toFixed(3)})`)
  ).join("") +
  kf("mb-sway", (u) => `translate3d(calc(${(5 * Math.sin(TAU * u) + 2 * Math.sin(2 * TAU * u + 1)).toFixed(2)}vw * var(--k,1)),0,0) rotate(calc(${(4 * Math.sin(TAU * u + 0.6) + 1.5 * Math.sin(3 * TAU * u)).toFixed(2)}deg * var(--k,1)))`);

const CELL = 48;
const MESH_CSS = `
${MESH_KF}
@keyframes mb-breathe{from{opacity:.6}to{opacity:1}}
.mb-anim{will-change:transform,opacity;animation-duration:var(--t),var(--b);
  animation-timing-function:linear,ease-in-out;animation-delay:var(--dl),var(--dl);
  animation-iteration-count:infinite;animation-direction:normal,alternate}
.mb-d1{animation-name:mb-d1,mb-breathe}.mb-d2{animation-name:mb-d2,mb-breathe}
.mb-d3{animation-name:mb-d3,mb-breathe}.mb-w{animation-name:mb-sway,mb-breathe}
.mb-blob{position:absolute;width:60vw;height:65vh;
  background:radial-gradient(closest-side,rgba(var(--c),var(--a)),rgba(var(--c),0))}
.mb-beam{position:absolute;top:-25vh;height:150vh;transform-origin:50% 0;
  background:radial-gradient(ellipse 50% 100% at 50% 0%,rgba(255,255,255,.75),rgba(255,255,255,0))}
.mb-grid{position:absolute;inset:0;
  background-image:linear-gradient(rgba(37,99,235,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.09) 1px,transparent 1px);
  background-size:${CELL}px ${CELL}px;
  -webkit-mask-image:linear-gradient(180deg,#000 0%,transparent 95%);mask-image:linear-gradient(180deg,#000 0%,transparent 95%)}
.mb-spot{position:absolute;left:0;top:0;width:${RADIUS * 2}px;height:${RADIUS * 2}px;opacity:0;
  transition:opacity .35s;will-change:transform,opacity;
  background-image:radial-gradient(closest-side,rgba(255,255,255,.5),rgba(255,255,255,0)),
    linear-gradient(rgba(37,99,235,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.4) 1px,transparent 1px);
  background-size:auto,${CELL}px ${CELL}px,${CELL}px ${CELL}px;
  background-position:0 0,var(--bx,0px) var(--by,0px),var(--bx,0px) var(--by,0px);
  -webkit-mask-image:radial-gradient(closest-side,#000 30%,transparent 100%);
  mask-image:radial-gradient(closest-side,#000 30%,transparent 100%)}
@media (prefers-reduced-motion:reduce){.mb-anim{animation:none}.mb-spot{display:none}}
`;

const MESH_BLOBS = [
  { left: "-10%", top: "-15%", c: "37,99,235", a: 0.5, k: 1, t: 78, b: 23 },
  { left: "30%", top: "-20%", c: "147,197,253", a: 0.65, k: -1, t: 94, b: 29 },
  { left: "65%", top: "-10%", c: "255,255,255", a: 0.95, k: 1.1, t: 71, b: 19 },
  { left: "-5%", top: "45%", c: "96,165,250", a: 0.55, k: -0.9, t: 103, b: 31 },
  { left: "35%", top: "50%", c: "29,78,216", a: 0.3, k: 1.2, t: 86, b: 37 },
  { left: "68%", top: "45%", c: "191,219,254", a: 0.85, k: -1.1, t: 97, b: 27 },
];
const MESH_BEAMS = [
  { left: "8%", w: "16vw", k: 1, t: 52, b: 15 },
  { left: "30%", w: "12vw", k: -1.2, t: 67, b: 19 },
  { left: "54%", w: "18vw", k: 0.9, t: 45, b: 13 },
  { left: "78%", w: "13vw", k: -0.8, t: 59, b: 17 },
];
const meshAnim = (i: number, k: number, t: number, b: number): V => ({
  "--k": k, "--t": `${t}s`, "--b": `${b}s`, "--dl": `-${(i * 11.7).toFixed(1)}s`,
});

export function MeshBackground({ interactive = true }: { interactive?: boolean }) {
  const spot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spot.current;
    if (!interactive || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let active = false;
    let raf = 0;
    const R = RADIUS;
    const wrap = (v: number) => ((v % CELL) + CELL) % CELL;

    const tick = () => {
      cur.x += (target.x - cur.x) * 0.18;
      cur.y += (target.y - cur.y) * 0.18;
      const x = Math.round(cur.x - R); // whole pixels, so the lit lines sit exactly on the grid
      const y = Math.round(cur.y - R);
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      el.style.setProperty("--bx", `${wrap(-x)}px`);
      el.style.setProperty("--by", `${wrap(-y)}px`);
      const lag = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y);
      raf = active || lag > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!active) {
        active = true;
        cur.x = target.x;
        cur.y = target.y;
        el.style.opacity = "1";
      }
      start();
    };
    const onLeave = () => {
      active = false;
      el.style.opacity = "0";
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") onLeave();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onLeave, { passive: true });
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [interactive]);

  return (
    <div
      className="bb-root"
      style={{ background: "linear-gradient(180deg,#F8FBFF 0%,#E4EEFF 100%)" }}
      aria-hidden="true"
    >
      <style>{ROOT_CSS + MESH_CSS}</style>

      {MESH_BLOBS.map((b, i) => (
        <div
          key={i}
          className={`mb-blob mb-anim mb-d${(i % 3) + 1}`}
          style={{ left: b.left, top: b.top, ...meshAnim(i, b.k, b.t, b.b), "--c": b.c, "--a": b.a } as V}
        />
      ))}

      {MESH_BEAMS.map((b, i) => (
        <div
          key={i}
          className="mb-beam mb-anim mb-w"
          style={{ left: b.left, width: b.w, ...meshAnim(i + 6, b.k, b.t, b.b) } as V}
        />
      ))}

      <div className="mb-grid" />
      {interactive && <div ref={spot} className="mb-spot" />}
    </div>
  );
}

// =====================================================================================
// Selector
// =====================================================================================
export function BlueBackground({
  variant = "aurora",
  interactive = true,
}: {
  variant?: BackgroundVariant;
  interactive?: boolean;
}) {
  switch (variant) {
    case "waves":
      return <WavesBackground interactive={interactive} />;
    case "bubbles":
      return <BubblesBackground interactive={interactive} />;
    case "constellation":
      return <ConstellationBackground interactive={interactive} />;
    case "mesh":
      return <MeshBackground interactive={interactive} />;
    default:
      return <AuroraBackground   />;
  }
}

/* ---------------------------------------------------------------
USAGE

// app/layout.tsx
import { BlueBackground } from "@/components/blue-backgrounds";

<body>
  <BlueBackground variant="waves" />
  {children}
</body>

// Switch at runtime (e.g. a theme picker):
const [variant, setVariant] = useState<BackgroundVariant>("aurora");
<BlueBackground variant={variant} />

// Both files must sit in the same folder (this one imports ./aurora-background).

// Blurred cards on top (Tailwind). Works on shadcn <Card className="..."> too:
<div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150">
  ...
</div>

Note: don't put an opaque bg-* on your page wrappers, or it will cover the background.
---------------------------------------------------------------- */