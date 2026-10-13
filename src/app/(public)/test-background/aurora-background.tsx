"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Blue + white aurora background.
 *
 * MOTION (always on, independent of the mouse)
 *  - Every aurora blob and shape glides along its own smooth curved path (4 path shapes).
 *    Direction keeps changing continuously and speed swells and eases off gradually: no
 *    stops, no sudden turns, no speed jumps. Each element has its own loop time, distance
 *    and direction (negative k = mirrored), plus a separate opacity "breathing" cycle.
 *
 * MOUSE (local only, pick any combination with the `mouse` prop)
 *  - "shapes"    nearby rings/orbs get pushed away and swell
 *  - "trail"     a soft light trail that fades out behind the cursor
 *  - "particles" a field of small dots that drift on their own and scatter away from the cursor
 *  - "ripple"    rings spread out from the cursor as you move (bigger one on click/tap)
 *  - "glow"      the original soft light under the cursor
 *  Nothing reaches farther than RADIUS px from the cursor.
 *
 * PERF
 *  - Only transform/opacity are animated (GPU composited). No animated blur/filter/shadow.
 *  - Soft edges come from radial-gradients, not filter: blur().
 *  - Trail, particles and ripples are drawn on ONE small canvas (pre-rendered soft sprite,
 *    DPR capped at 1.5). One rAF loop, refs only, no React state. It idles when nothing is
 *    moving, except with "particles" on, where it keeps the dots drifting (~70 tiny arcs).
 *  - pointer-events: none, so it never blocks clicks. Reduced-motion users get it static.
 */

type V = CSSProperties & Record<`--${string}`, string | number>;

const RADIUS = 170; // how far the mouse effect reaches (px)
const SLOW = 2; // global slow-down: 1 = original speed, 2 = twice as slow, 3 = even calmer

// ---- Motion paths ---------------------------------------------------------------------
// Each path is a smooth closed curve made of sine waves [harmonic, amplitude, phase], sampled
// into many tiny linear steps (no sharp turns, no stops). `warp` bends time so the element
// glides faster and slower in a continuous way: its speed swings by a ratio of
// (1 + warp) / (1 - warp) but never jumps. Keep |warp| below ~0.6 for gentle changes.
type Wave = [number, number, number];
type Path = { x: Wave[]; y: Wave[]; r: Wave[]; s: Wave[]; warp: number };
const PATHS: Path[] = [
  { x: [[1, 11, 0], [3, 3, 1.2]], y: [[2, 7, 0.6], [1, 5, 2.1]], r: [[1, 8, 0.4], [2, 3, 1.7]], s: [[2, 0.1, 0.3], [1, 0.05, 1]], warp: 0.5 },
  { x: [[1, 12, 2.0], [2, 4, 0.5]], y: [[1, 9, 0.3], [3, 3, 2.4]], r: [[1, 7, 1.1], [3, 2, 0.2]], s: [[1, 0.09, 2], [3, 0.04, 0.7]], warp: -0.5 },
  { x: [[2, 9, 1], [1, 8, 3]], y: [[1, 10, 1.5], [2, 4, 0.2]], r: [[2, 6, 0.9], [1, 4, 2.5]], s: [[1, 0.1, 0.5], [2, 0.05, 2.2]], warp: 0.55 },
  { x: [[1, 13, 0.2], [2, 3, 2.6]], y: [[3, 5, 0.9], [1, 8, 2.8]], r: [[1, 9, 2.2], [2, 3, 0.8]], s: [[2, 0.09, 1.4], [1, 0.06, 0.1]], warp: -0.55 },
];
const STEPS = 36;
const wave = (ws: Wave[], u: number) => ws.reduce((a, [n, amp, ph]) => a + amp * Math.sin(2 * Math.PI * n * u + ph), 0);

const KEYFRAMES = PATHS.map((path, i) => {
  const frames: string[] = [];
  for (let j = 0; j <= STEPS; j++) {
    const t = j / STEPS;
    const u = t + (path.warp * Math.sin(2 * Math.PI * t)) / (2 * Math.PI); // smooth time warp, u(0)=0, u(1)=1
    const x = wave(path.x, u).toFixed(2);
    const y = wave(path.y, u).toFixed(2);
    const r = wave(path.r, u).toFixed(2);
    const sc = (1 + wave(path.s, u)).toFixed(3);
    frames.push(
      `${(t * 100).toFixed(2)}%{transform:translate3d(calc(${x}vw * var(--k,1)),calc(${y}vh * var(--k,1)),0) rotate(calc(${r}deg * var(--rk,var(--k,1)))) scale(${sc})}`
    );
  }
  return `@keyframes ab-p${i + 1}{${frames.join("")}}`;
}).join("");

const CSS = `
${KEYFRAMES}
@keyframes ab-breathe{from{opacity:.6}to{opacity:1}}
.ab-root{position:fixed;inset:0;z-index:-10;overflow:hidden;pointer-events:none;contain:strict;
  background:linear-gradient(180deg,#F8FBFF 0%,#EAF2FF 55%,#DCEAFF 100%)}
.ab-anim{will-change:transform,opacity;
  animation-duration:var(--t),var(--b);animation-timing-function:linear,ease-in-out;
  animation-delay:var(--dl),var(--dl);animation-iteration-count:infinite;animation-direction:normal,alternate}
.ab-p1{animation-name:ab-p1,ab-breathe}.ab-p2{animation-name:ab-p2,ab-breathe}
.ab-p3{animation-name:ab-p3,ab-breathe}.ab-p4{animation-name:ab-p4,ab-breathe}
.ab-blob{position:absolute;background:radial-gradient(closest-side,rgba(var(--c),var(--a)),rgba(var(--c),0))}
.ab-canvas{position:absolute;inset:0;width:100%;height:100%}
.ab-par{position:absolute;will-change:transform}
.ab-shape{width:100%;height:100%;border-radius:50%;--rk:0}
.ab-ring{border:1.5px solid rgba(59,130,246,.35);
  background:radial-gradient(closest-side,rgba(255,255,255,0) 70%,rgba(147,197,253,.28))}
.ab-orb{background:radial-gradient(circle at 30% 28%,#fff 0%,rgba(191,219,254,.95) 35%,rgba(59,130,246,.55) 100%)}
.ab-glow{position:absolute;left:0;top:0;width:${RADIUS * 2}px;height:${RADIUS * 2}px;opacity:0;
  transform:translate3d(-9999px,0,0);transition:opacity .35s;will-change:transform,opacity;
  background:radial-gradient(closest-side,rgba(255,255,255,.55) 0%,rgba(219,234,254,.42) 14%,rgba(147,197,253,.28) 32%,rgba(96,165,250,.14) 56%,rgba(59,130,246,.05) 80%,rgba(59,130,246,0) 100%)}
@media (prefers-reduced-motion:reduce){.ab-anim{animation:none}.ab-glow,.ab-canvas{display:none}}
`;

// ---- Aurora blobs: p = path, k = amplitude (negative = mirrored), t/b = loop seconds ----
type Blob = { box: CSSProperties; c: string; a: number; p: number; k: number; t: number; b: number };
const AURORA: Blob[] = [
  { box: { left: "-15%", top: "-25%", width: "75vw", height: "65vh" }, c: "37,99,235", a: 0.5, p: 1, k: 1, t: 37, b: 11 },
  { box: { right: "-20%", top: "-10%", width: "70vw", height: "55vh" }, c: "96,165,250", a: 0.55, p: 2, k: -1, t: 53, b: 17 },
  { box: { left: "10%", bottom: "-30%", width: "90vw", height: "60vh" }, c: "147,197,253", a: 0.6, p: 3, k: 1.1, t: 61, b: 13 },
  { box: { left: "30%", top: "25%", width: "50vw", height: "40vh" }, c: "255,255,255", a: 0.9, p: 4, k: -1.2, t: 29, b: 9 },
  { box: { right: "5%", bottom: "5%", width: "45vw", height: "40vh" }, c: "29,78,216", a: 0.28, p: 2, k: 0.9, t: 47, b: 19 },
];

// ---- Floating shapes. push = how hard the cursor shoves it (px) ----------------------
type Shape = { kind: "ring" | "orb"; size: number; left: string; top: string; p: number; k: number; t: number; b: number; push: number };
const SHAPES: Shape[] = [
  { kind: "ring", size: 220, left: "8%", top: "18%", p: 1, k: 0.35, t: 23, b: 12, push: 70 },
  { kind: "orb", size: 90, left: "78%", top: "14%", p: 3, k: -0.5, t: 17, b: 8, push: 60 },
  { kind: "ring", size: 140, left: "84%", top: "62%", p: 2, k: 0.4, t: 31, b: 14, push: 55 },
  { kind: "orb", size: 140, left: "16%", top: "70%", p: 4, k: -0.3, t: 27, b: 10, push: 65 },
  { kind: "ring", size: 70, left: "52%", top: "8%", p: 2, k: 0.6, t: 13, b: 9, push: 90 },
  { kind: "orb", size: 54, left: "46%", top: "82%", p: 1, k: -0.7, t: 15, b: 7, push: 90 },
  { kind: "orb", size: 36, left: "28%", top: "40%", p: 3, k: 0.8, t: 11, b: 6, push: 110 },
  { kind: "ring", size: 110, left: "62%", top: "38%", p: 4, k: -0.45, t: 35, b: 15, push: 75 },
  { kind: "orb", size: 64, left: "90%", top: "38%", p: 1, k: 0.6, t: 19, b: 9, push: 80 },
  { kind: "ring", size: 48, left: "4%", top: "48%", p: 3, k: -0.8, t: 14, b: 7, push: 100 },
  { kind: "orb", size: 28, left: "68%", top: "72%", p: 2, k: 0.9, t: 10, b: 5, push: 120 },
  { kind: "ring", size: 90, left: "36%", top: "60%", p: 4, k: 0.5, t: 25, b: 11, push: 70 },
];

const anim = (i: number, k: number, t: number, b: number): V => ({
  "--k": k,
  "--t": `${t * SLOW}s`,
  "--b": `${b * SLOW}s`,
  "--dl": `-${(i * 7.3).toFixed(1)}s`, // negative delay = start mid-loop, so nothing moves in sync
});

export type MouseEffect = "shapes" | "trail" | "particles" | "ripple" | "glow";
const DEFAULT_MOUSE: MouseEffect[] = ["trail", "shapes"];

export function AuroraBackground({ mouse = DEFAULT_MOUSE }: { mouse?: MouseEffect[] }) {
  const root = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const key = mouse.join(",");
  const needCanvas = mouse.some((m) => m === "trail" || m === "particles" || m === "ripple");

  useEffect(() => {
    const el = root.current;
    if (!el || !key) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const on = new Set(key.split(","));
    const useShapes = on.has("shapes");
    const useTrail = on.has("trail");
    const useDots = on.has("particles");
    const useRipple = on.has("ripple");
    const g = on.has("glow") ? glow.current : null;
    const canvas = cvs.current;
    const ctx = canvas ? canvas.getContext("2d") : null;

    // ---- canvas sizing ----
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0;
    const resize = () => {
      if (!canvas || !ctx) return;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // ---- trail sprite: soft light, pre-rendered once ----
    let sprite: HTMLCanvasElement | null = null;
    if (useTrail) {
      sprite = document.createElement("canvas");
      sprite.width = sprite.height = 64;
      const sg = sprite.getContext("2d");
      if (sg) {
        const gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, "rgba(255,255,255,.95)");
        gr.addColorStop(0.3, "rgba(191,219,254,.6)");
        gr.addColorStop(0.6, "rgba(96,165,250,.22)");
        gr.addColorStop(1, "rgba(59,130,246,0)");
        sg.fillStyle = gr;
        sg.fillRect(0, 0, 64, 64);
      }
    }

    // ---- effect state ----
    const TRAIL_MS = 900;
    const RIPPLE_MS = 1100;
    const trail: { x: number; y: number; born: number }[] = [];
    const ripples: { x: number; y: number; born: number; max: number }[] = [];
    const dots = useDots
      ? Array.from({ length: 70 }, () => ({
          fx: Math.random(), fy: Math.random(), r: 1.4 + Math.random() * 2.4,
          ph: Math.random() * 6.28, amp: 6 + Math.random() * 14, sp: 0.15 + Math.random() * 0.25,
          blue: Math.random() < 0.4, ox: 0, oy: 0,
        }))
      : [];

    const pars = useShapes ? Array.from(el.querySelectorAll<HTMLElement>(".ab-par")) : [];
    const inner = pars.map((p) => p.firstElementChild as HTMLElement);
    const st = pars.map(() => ({ x: 0, y: 0, s: 1 }));

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const last = { x: 0, y: 0 }; // last trail emit
    let rippleDist = 0;
    let active = false;
    let raf = 0;

    const tick = () => {
      const now = performance.now();

      // glow
      let lag = 0;
      if (g) {
        cur.x += (target.x - cur.x) * 0.1;
        cur.y += (target.y - cur.y) * 0.1;
        lag = Math.hypot(target.x - cur.x, target.y - cur.y);
        const gs = 1 + Math.min(lag / 260, 0.4);
        g.style.transform = `translate3d(${(cur.x - RADIUS).toFixed(1)}px,${(cur.y - RADIUS).toFixed(1)}px,0) scale(${gs.toFixed(3)})`;
      }

      // shapes: read all rects first, then write
      let moving = false;
      if (useShapes) {
        const rects = inner.map((n) => n.getBoundingClientRect());
        pars.forEach((p, i) => {
          const r = rects[i];
          const s = st[i];
          const cx = r.left + r.width / 2 - s.x;
          const cy = r.top + r.height / 2 - s.y;
          let tx = 0, ty = 0, ts = 1;
          if (active) {
            const dx = cx - target.x;
            const dy = cy - target.y;
            const d = Math.hypot(dx, dy);
            if (d < RADIUS) {
              const f = (1 - d / RADIUS) ** 2;
              tx = (dx / (d || 1)) * f * SHAPES[i].push;
              ty = (dy / (d || 1)) * f * SHAPES[i].push;
              ts = 1 + f * 0.14;
            }
          }
          s.x += (tx - s.x) * 0.08;
          s.y += (ty - s.y) * 0.08;
          s.s += (ts - s.s) * 0.08;
          if (Math.abs(tx - s.x) + Math.abs(ty - s.y) + Math.abs(ts - s.s) * 50 > 0.2) moving = true;
          p.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) scale(${s.s.toFixed(3)})`;
        });
      }

      // canvas effects
      if (ctx) {
        ctx.clearRect(0, 0, W, H);

        if (useTrail && sprite) {
          while (trail.length && now - trail[0].born > TRAIL_MS) trail.shift();
          for (const pt of trail) {
            const life = 1 - (now - pt.born) / TRAIL_MS;
            const size = 34 + 56 * life;
            ctx.globalAlpha = life * life * 0.6;
            ctx.drawImage(sprite, pt.x - size / 2, pt.y - size / 2, size, size);
          }
          ctx.globalAlpha = 1;
        }

        if (useRipple) {
          while (ripples.length && now - ripples[0].born > RIPPLE_MS) ripples.shift();
          ctx.lineWidth = 1.5;
          for (const rp of ripples) {
            const age = (now - rp.born) / RIPPLE_MS;
            const e = 1 - (1 - age) ** 3; // ease-out: spreads fast, then slows
            const a = (1 - age) * 0.55;
            ctx.strokeStyle = `rgba(59,130,246,${a.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, e * rp.max, 0, 6.2832);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,255,255,${(a * 1.4).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, e * rp.max * 0.72, 0, 6.2832);
            ctx.stroke();
          }
        }

        if (useDots) {
          const t = now / 1000;
          ctx.lineWidth = 1;
          for (const d of dots) {
            const hx = d.fx * W + Math.sin(t * d.sp + d.ph) * d.amp;
            const hy = d.fy * H + Math.cos(t * d.sp * 0.8 + d.ph) * d.amp;
            let tx = 0, ty = 0;
            if (active) {
              const dx = hx - target.x;
              const dy = hy - target.y;
              const dist = Math.hypot(dx, dy);
              if (dist < RADIUS) {
                const f = (1 - dist / RADIUS) ** 2;
                tx = (dx / (dist || 1)) * f * 90;
                ty = (dy / (dist || 1)) * f * 90;
              }
            }
            d.ox += (tx - d.ox) * 0.08;
            d.oy += (ty - d.oy) * 0.08;
            ctx.beginPath();
            ctx.arc(hx + d.ox, hy + d.oy, d.r, 0, 6.2832);
            if (d.blue) {
              ctx.fillStyle = "rgba(59,130,246,.45)";
              ctx.fill();
            } else {
              ctx.fillStyle = "rgba(255,255,255,.9)";
              ctx.strokeStyle = "rgba(147,197,253,.7)";
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      }

      const busy = trail.length > 0 || ripples.length > 0;
      raf = active || moving || busy || lag > 0.5 || useDots ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const px = target.x, py = target.y;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!active) {
        active = true;
        cur.x = last.x = target.x; // start under the cursor instead of flying in
        cur.y = last.y = target.y;
        rippleDist = 0;
        if (g) g.style.opacity = "1";
      } else {
        // trail: drop points every ~7px along the path (max 12 per event)
        const dx = target.x - last.x;
        const dy = target.y - last.y;
        const dist = Math.hypot(dx, dy);
        if (useTrail && dist >= 7) {
          const n = Math.min(Math.floor(dist / 7), 12);
          const now = performance.now();
          for (let i = 1; i <= n; i++) {
            trail.push({ x: last.x + (dx * i) / n, y: last.y + (dy * i) / n, born: now });
          }
          while (trail.length > 90) trail.shift();
          last.x = target.x;
          last.y = target.y;
        }
        // ripple: a new ring every ~90px of travel
        rippleDist += Math.hypot(target.x - px, target.y - py);
        if (useRipple && rippleDist >= 90) {
          rippleDist = 0;
          ripples.push({ x: target.x, y: target.y, born: performance.now(), max: RADIUS * 0.85 });
          while (ripples.length > 10) ripples.shift();
        }
      }
      start();
    };
    const onDown = (e: PointerEvent) => {
      if (!useRipple) return;
      ripples.push({ x: e.clientX, y: e.clientY, born: performance.now(), max: RADIUS * 1.3 });
      while (ripples.length > 10) ripples.shift();
      start();
    };
    const onLeave = () => {
      active = false;
      if (g) g.style.opacity = "0";
      start();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") onLeave();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onLeave, { passive: true });
    window.addEventListener("blur", onLeave);
    window.addEventListener("resize", resize);
    document.documentElement.addEventListener("pointerleave", onLeave);
    if (useDots) start(); // dots drift on their own, so begin immediately

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", resize);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      if (ctx) ctx.clearRect(0, 0, W, H);
      pars.forEach((p) => (p.style.transform = ""));
    };
  }, [key]);

  return (
    <div ref={root} className="ab-root" aria-hidden="true">
      <style>{CSS}</style>

      {AURORA.map((b, i) => (
        <div
          key={i}
          className={`ab-blob ab-anim ab-p${b.p}`}
          style={{ ...b.box, ...anim(i, b.k, b.t, b.b), "--c": b.c, "--a": b.a } as V}
        />
      ))}

      {needCanvas && <canvas ref={cvs} className="ab-canvas" />}
      {mouse.includes("glow") && <div ref={glow} className="ab-glow" />}

      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="ab-par"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
        >
          <div
            className={`ab-shape ab-anim ab-p${s.p} ${s.kind === "ring" ? "ab-ring" : "ab-orb"}`}
            style={anim(i + AURORA.length, s.k, s.t, s.b)}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
USAGE

// app/layout.tsx
import { AuroraBackground } from "@/components/aurora-background";

<body>
  <AuroraBackground />   // default: mouse={["trail", "shapes"]}
  {children}
</body>

// Pick any mix of mouse effects (all are local to the cursor):
//   <AuroraBackground mouse={["trail"]} />
//   <AuroraBackground mouse={["particles", "ripple"]} />
//   <AuroraBackground mouse={["shapes", "trail", "particles", "ripple", "glow"]} />
//   <AuroraBackground mouse={[]} />          // no mouse reaction at all
// Switch at runtime: keep the array in useState (or a settings toggle) and pass it in;
// changing it just re-wires the listeners, nothing remounts.
// Tuning: SLOW (overall speed), RADIUS (reach of the mouse effect), each shape's `push`,
// and per-element t / b / k / p values (loop time, breathing time, amplitude+direction, path).

// Blurred cards on top (Tailwind). Works on shadcn <Card className="..."> too:
<div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_rgba(37,99,235,0.10)] backdrop-blur-xl backdrop-saturate-150">
  ...
</div>

Note: don't put an opaque bg-* on your page wrappers, or it will cover the aurora.
---------------------------------------------------------------- */