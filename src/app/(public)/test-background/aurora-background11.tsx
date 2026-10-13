"use client";

import { useEffect, useRef, type Ref } from "react";
import { useTheme } from "next-themes";

/**
 * Shared engine for the ATS backgrounds (TalentFlow, HiringHub, TalentMatch).
 * Put this file next to them (components/ats-bg-engine.tsx).
 *
 * What it does for every scene, so each scene only has to draw:
 *  - ONE full-screen canvas, DPR capped at 1.5
 *  - ONE rAF loop on a single monotonic clock (clicks use the same clock, so ages never go negative)
 *  - adaptive quality: if the device can't hold ~35fps the engine drops to "lite" (DPR 1, fewer
 *    particles; scenes read frame.lite) and never goes back, so it can't flap
 *  - sprites are pre-rendered ONCE for light and dark; theme changes crossfade the two sets
 *  - next-themes light/dark with a smooth ~0.5s crossfade, no flash on first paint
 *  - prefers-reduced-motion = one static frame, no listeners for clicks
 *  - pointer-events: none, never blocks the page
 */

export const TAU = Math.PI * 2;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type RGB = [number, number, number];

// ---- shared ATS palette -----------------------------------------------------------------
export const ATS_LIGHT = {
  ink: [71, 85, 140],
  blue: [37, 99, 235],
  sky: [14, 165, 233],
  cyan: [6, 182, 212],
  indigo: [79, 70, 229],
  violet: [124, 58, 237],
  pink: [219, 39, 119],
  green: [22, 163, 74],
  amber: [245, 158, 11],
  white: [255, 255, 255],
  panel: [255, 255, 255],
} satisfies Record<string, RGB>;
export type AtsCol = keyof typeof ATS_LIGHT;

export const ATS_DARK: Record<AtsCol, RGB> = {
  ink: [190, 200, 255],
  blue: [96, 165, 250],
  sky: [56, 189, 248],
  cyan: [34, 211, 238],
  indigo: [129, 140, 248],
  violet: [167, 139, 250],
  pink: [244, 114, 182],
  green: [74, 222, 128],
  amber: [251, 191, 36],
  white: [255, 255, 255],
  panel: [22, 30, 62],
};

export function createPalette() {
  const keys = Object.keys(ATS_LIGHT) as AtsCol[];
  const cur = {} as Record<AtsCol, string>;
  const fixed = (P: Record<AtsCol, RGB>) => {
    const s = {} as Record<AtsCol, string>;
    keys.forEach((k) => (s[k] = P[k].join(",")));
    return (k: AtsCol, a: number) => `rgba(${s[k]},${a})`;
  };
  let last = -1;
  const update = (mix: number) => {
    if (mix === last) return;
    last = mix;
    keys.forEach((k) => {
      cur[k] = [0, 1, 2].map((i) => Math.round(ATS_LIGHT[k][i] + (ATS_DARK[k][i] - ATS_LIGHT[k][i]) * mix)).join(",");
    });
  };
  update(0);
  return {
    /** live colour, blended between light and dark */
    rg: (k: AtsCol, a: number) => `rgba(${cur[k]},${a})`,
    /** fixed light / dark colour (for baking sprites) */
    rL: fixed(ATS_LIGHT),
    rD: fixed(ATS_DARK),
    update,
  };
}
export type Palette = ReturnType<typeof createPalette>;

// ---- drawing helpers --------------------------------------------------------------------
type G = CanvasRenderingContext2D;

/** adds a rounded rect to the current path (no beginPath) */
export function rrPath(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/** starts a new path with a rounded rect */
export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  rrPath(g, x, y, w, h, r);
}

export type IconName = "person" | "cap" | "building" | "briefcase" | "plug" | "doc" | "search" | "chat" | "mail" | "check";

/** line icons on a 24-unit grid, centred on (cx, cy), `size` px wide */
export function drawIcon(g: G, name: IconName, cx: number, cy: number, size: number, color: string) {
  g.save();
  g.translate(cx, cy);
  g.scale(size / 24, size / 24);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 2;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  switch (name) {
    case "person":
      g.arc(0, -4.5, 4, 0, TAU);
      g.moveTo(-8, 10);
      g.bezierCurveTo(-8, 4, -4, 2, 0, 2);
      g.bezierCurveTo(4, 2, 8, 4, 8, 10);
      g.stroke();
      break;
    case "cap":
      g.moveTo(0, -8);
      g.lineTo(11, -3);
      g.lineTo(0, 2);
      g.lineTo(-11, -3);
      g.closePath();
      g.moveTo(-6, -0.5);
      g.lineTo(-6, 5);
      g.quadraticCurveTo(0, 9, 6, 5);
      g.lineTo(6, -0.5);
      g.moveTo(11, -3);
      g.lineTo(11, 4);
      g.stroke();
      break;
    case "building":
      g.rect(-6, -9, 12, 18);
      g.moveTo(-1.5, 9);
      g.lineTo(-1.5, 5);
      g.lineTo(1.5, 5);
      g.lineTo(1.5, 9);
      g.stroke();
      g.fillRect(-3.5, -6, 2, 2);
      g.fillRect(1.5, -6, 2, 2);
      g.fillRect(-3.5, -1.5, 2, 2);
      g.fillRect(1.5, -1.5, 2, 2);
      break;
    case "briefcase":
      rrPath(g, -10, -5, 20, 14, 3);
      g.moveTo(-4, -5);
      g.lineTo(-4, -8);
      g.lineTo(4, -8);
      g.lineTo(4, -5);
      g.moveTo(-10, 1);
      g.lineTo(10, 1);
      g.stroke();
      break;
    case "plug":
      g.moveTo(-5, -1);
      g.lineTo(5, -1);
      g.lineTo(5, 3);
      g.quadraticCurveTo(5, 7, 0, 7);
      g.quadraticCurveTo(-5, 7, -5, 3);
      g.closePath();
      g.moveTo(-2.5, -1);
      g.lineTo(-2.5, -7);
      g.moveTo(2.5, -1);
      g.lineTo(2.5, -7);
      g.moveTo(0, 7);
      g.lineTo(0, 11);
      g.stroke();
      break;
    case "doc":
      g.moveTo(-6, -10);
      g.lineTo(2, -10);
      g.lineTo(7, -5);
      g.lineTo(7, 10);
      g.lineTo(-6, 10);
      g.closePath();
      g.moveTo(2, -10);
      g.lineTo(2, -5);
      g.lineTo(7, -5);
      g.moveTo(-3, 1);
      g.lineTo(4, 1);
      g.moveTo(-3, 5);
      g.lineTo(4, 5);
      g.stroke();
      break;
    case "search":
      g.arc(-2, -2, 7, 0, TAU);
      g.moveTo(3, 3);
      g.lineTo(9, 9);
      g.stroke();
      break;
    case "chat":
      rrPath(g, -10, -8, 20, 14, 4);
      g.moveTo(-4, 6);
      g.lineTo(-6, 10);
      g.lineTo(1, 6);
      g.moveTo(-5, -3);
      g.lineTo(5, -3);
      g.moveTo(-5, 1);
      g.lineTo(2, 1);
      g.stroke();
      break;
    case "mail":
      rrPath(g, -10, -7, 20, 14, 3);
      g.moveTo(-10, -5.5);
      g.lineTo(0, 2);
      g.lineTo(10, -5.5);
      g.stroke();
      break;
    case "check":
      g.moveTo(-6, 0.5);
      g.lineTo(-2, 5);
      g.lineTo(7, -5);
      g.stroke();
      break;
  }
  g.restore();
}

// ---- sprites ----------------------------------------------------------------------------
export function makeSprite(w: number, h: number, scale: number, paint: (g: G) => void) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const g = c.getContext("2d");
  if (g) {
    g.scale(scale, scale);
    paint(g);
  }
  return c;
}

export interface Dual {
  L: HTMLCanvasElement;
  D: HTMLCanvasElement;
  w: number;
  h: number;
}
/** a sprite baked once for light and once for dark */
export function dualSprite(w: number, h: number, paint: (g: G, dark: boolean) => void, scale = 2): Dual {
  return {
    L: makeSprite(w, h, scale, (g) => paint(g, false)),
    D: makeSprite(w, h, scale, (g) => paint(g, true)),
    w,
    h,
  };
}
/** draws a dual sprite, crossfading light/dark while the theme changes (one draw call at rest) */
export function blit(ctx: G, s: Dual, mix: number, x: number, y: number, w: number, h: number, alpha = 1) {
  if (alpha <= 0.004) return;
  if (mix < 0.004) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(s.L, x, y, w, h);
  } else if (mix > 0.996) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(s.D, x, y, w, h);
  } else {
    ctx.globalAlpha = alpha * (1 - mix);
    ctx.drawImage(s.L, x, y, w, h);
    ctx.globalAlpha = alpha * mix;
    ctx.drawImage(s.D, x, y, w, h);
  }
  ctx.globalAlpha = 1;
}

/** round glass badge with an icon and a caption underneath. 92x84, circle centre at (46, 30) */
export function makeBadge(pal: Palette, icon: IconName, col: AtsCol, label: string) {
  return dualSprite(92, 84, (g, dark) => {
    const c = dark ? pal.rD : pal.rL;
    g.beginPath();
    g.arc(46, 30, 25, 0, TAU);
    g.shadowColor = dark ? "rgba(0,0,0,.4)" : "rgba(60,70,140,.22)";
    g.shadowBlur = 10;
    g.shadowOffsetY = 3;
    g.fillStyle = c("panel", dark ? 0.9 : 0.92);
    g.fill();
    g.shadowColor = "transparent";
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;
    g.lineWidth = 2;
    g.strokeStyle = c(col, 0.8);
    g.stroke();
    g.beginPath();
    g.arc(46, 30, 31, 0, TAU);
    g.lineWidth = 1;
    g.strokeStyle = c(col, 0.28);
    g.stroke();
    drawIcon(g, icon, 46, 30, 26, c(col, 1));
    if (label) {
      g.font = "600 11px system-ui, -apple-system, 'Segoe UI', sans-serif";
      g.textAlign = "center";
      g.fillStyle = c(col, dark ? 1 : 0.95);
      g.fillText(label, 46, 77);
    }
  });
}

// ---- scene contract + hook --------------------------------------------------------------
export interface Frame {
  ctx: G;
  W: number;
  H: number;
  /** seconds, monotonic */
  t: number;
  /** seconds since last frame, capped at 0.05 */
  dt: number;
  /** 0 = light, 1 = dark (eased) */
  mix: number;
  /** true when the device is struggling: scenes should draw less */
  lite: boolean;
  /** screen-size factor, 0.65 .. 1.35 */
  sc: number;
}
export interface Scene {
  resize(W: number, H: number, lite: boolean): void;
  draw(f: Frame): void;
  pointer?(x: number, y: number, t: number): void;
}
export type SceneFactory = (ctx: G) => Scene;

/** wires a scene to a canvas. `create` must be a stable (module-level) function. */
export function useAtsBackground(create: SceneFactory, interactive: boolean) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  const targetRef = useRef(0); // 0 = light, 1 = dark
  const mixRef = useRef<number | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);

  // theme -> shared refs (declared before the draw effect so the first frame has the right mix)
  useEffect(() => {
    if (!resolvedTheme) return;
    const tg = resolvedTheme === "dark" ? 1 : 0;
    targetRef.current = tg;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (mixRef.current === null || reduce) {
      mixRef.current = tg;
      redrawRef.current?.();
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv ? cv.getContext("2d") : null;
    if (!cv || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let lite = false;
    let W = 0, H = 0;

    const scene = create(ctx);
    const f: Frame = { ctx, W: 0, H: 0, t: 0, dt: 0, mix: 0, lite: false, sc: 1 };

    const fit = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      f.W = W;
      f.H = H;
      scene.resize(W, H, lite);
    };
    const render = (t: number, dt: number) => {
      const raw = mixRef.current ?? 0;
      f.mix = raw * raw * (3 - 2 * raw);
      f.t = t;
      f.dt = dt;
      f.lite = lite;
      f.sc = Math.max(0.65, Math.min(1.35, H / 900));
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      scene.draw(f);
    };

    fit();
    let raf = 0;
    let last = performance.now() / 1000;
    let ema = 1 / 60;
    let frames = 0;
    const loop = () => {
      const now = performance.now() / 1000;
      const gap = Math.min(now - last, 0.1);
      last = now;
      const dt = Math.min(gap, 0.05);
      // glide the theme mix towards its target (~0.5 s)
      const tg = targetRef.current;
      const m = mixRef.current ?? tg;
      if (m !== tg) mixRef.current = m < tg ? Math.min(tg, m + dt * 2) : Math.max(tg, m - dt * 2);
      render(now, dt);
      // adaptive quality: step down once, never back up
      ema += (gap - ema) * 0.08;
      if (!lite && ++frames > 120 && ema > 1 / 34) {
        lite = true;
        dpr = 1;
        fit();
      }
      raf = requestAnimationFrame(loop);
    };

    if (reduce) {
      redrawRef.current = () => render(4, 0);
      render(4, 0);
    } else raf = requestAnimationFrame(loop);

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduce && !raf) {
        last = performance.now() / 1000;
        raf = requestAnimationFrame(loop);
      }
    };
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fit();
        if (reduce) render(4, 0);
      }, 150);
    };
    const onDown = (e: PointerEvent) => scene.pointer?.(e.clientX, e.clientY, performance.now() / 1000);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    if (interactive && !reduce) window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      redrawRef.current = null;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [create, interactive]);

  return ref;
}

/**
 * Fixed, click-through container. The page background is pure CSS keyed off next-themes
 * (class="dark" or data-theme="dark"); the dark look fades in on a ::before layer.
 */
export function BgShell({ id, light, dark, canvasRef }: { id: string; light: string; dark: string; canvasRef: Ref<HTMLCanvasElement> }) {
  const css =
    `.${id}{background:${light}}` +
    `.${id}::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .6s ease;background:${dark}}` +
    `.dark .${id}::before,[data-theme="dark"] .${id}::before{opacity:1}` +
    `@media (prefers-reduced-motion:reduce){.${id}::before{transition:none}}`;
  return (
    <>
      <style>{css}</style>
      <div
        aria-hidden="true"
        className={id}
        style={{ position: "fixed", inset: 0, zIndex: -10, overflow: "hidden", pointerEvents: "none", contain: "strict" }}
      >
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
    </>
  );
}