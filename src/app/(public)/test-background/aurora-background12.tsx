"use client";

import {
  BgShell,
  TAU,
  blit,
  clamp01,
  createPalette,
  drawIcon,
  dualSprite,
  makeBadge,
  makeSprite,
  rr,
  useAtsBackground,
  type AtsCol,
  type IconName,
  type SceneFactory,
} from "./ats-bg-engine";

/**
 * TalentFlow: the hiring pipeline as a living funnel.
 *
 *   <TalentFlowBackground />                      // click/tap = a surge of applications
 *   <TalentFlowBackground interactive={false} />
 *
 * Seven lanes sweep from the left (job seekers, schools) through five gates
 * (Applied > Screened > Interview > Offer > Hired) and converge on the right, where
 * companies, employers and HR-system integrations wait. Little resume cards ride the lanes;
 * most drop out at a gate, the lucky ones get hired with a small celebration.
 *
 * Layers: funnel wash > flowing dashed lanes > gate lines + gate nodes > connector curves >
 *         badges (sources, stages, targets) > gate pulses > resume cards > hired pops > click rings
 *
 * Performance: lanes/funnel/gates are Path2D built once per resize, every icon and card is a
 * sprite baked once, ~52 cards (26 in lite mode), one rAF loop (see ats-bg-engine.tsx).
 * Light + dark via next-themes. Needs <ThemeProvider> above it.
 */

const STAGES: { icon: IconName; col: AtsCol; label: string; fx: number }[] = [
  { icon: "doc", col: "sky", label: "Applied", fx: 0.14 },
  { icon: "search", col: "blue", label: "Screened", fx: 0.34 },
  { icon: "chat", col: "indigo", label: "Interview", fx: 0.54 },
  { icon: "mail", col: "violet", label: "Offer", fx: 0.74 },
  { icon: "check", col: "green", label: "Hired", fx: 0.92 },
];
const N_STAGE = STAGES.length;
const LANES = 7;
const NP = 64; // points per lane
const LANE_PH = [0.3, 1.7, 2.9, 4.1, 5.0, 0.9, 2.2];
const CHIP_HUES: AtsCol[] = ["sky", "violet", "pink", "cyan"];
const FATE_CUM = [0.34, 0.6, 0.77, 0.87, 1]; // where each card ends up: dropped at gate 0..3, or hired (4)
const RING_SECONDS = 0.7;
const POP_SECONDS = 1.1;

interface Particle {
  lane: number;
  s: number;
  sp: number;
  fate: number;
  v: number;
  ph: number;
  last: number;
}
interface Ring {
  x: number;
  y: number;
  t: number;
  c: AtsCol;
}
interface Pt {
  x: number;
  y: number;
}

const create: SceneFactory = (ctx) => {
  const pal = createPalette();
  const rg = pal.rg;

  // ---- sprites, once -------------------------------------------------------------------
  const chips = CHIP_HUES.map((hue) =>
    dualSprite(22, 28, (g, dark) => {
      const c = dark ? pal.rD : pal.rL;
      rr(g, 1, 1, 20, 26, 4);
      g.fillStyle = c("panel", 0.96);
      g.fill();
      g.lineWidth = 1.2;
      g.strokeStyle = c(hue, 0.75);
      g.stroke();
      g.fillStyle = c(hue, 0.95);
      g.beginPath();
      g.arc(11, 9, 3.6, 0, TAU);
      g.fill();
      rr(g, 5, 16, 12, 2, 1);
      g.fillStyle = c(hue, 0.5);
      g.fill();
      rr(g, 5, 20, 8, 2, 1);
      g.fill();
    }),
  );
  const stageBadges = STAGES.map((s) => makeBadge(pal, s.icon, s.col, s.label));
  const srcBadges = [makeBadge(pal, "person", "sky", "Job seekers"), makeBadge(pal, "cap", "violet", "Schools")];
  const tgtBadges = [
    makeBadge(pal, "building", "indigo", "Companies"),
    makeBadge(pal, "briefcase", "blue", "Employers"),
    makeBadge(pal, "plug", "green", "HR systems"),
  ];
  const hiredIcon = makeSprite(30, 30, 2, (g) => {
    g.beginPath();
    g.arc(15, 15, 14, 0, TAU);
    g.fillStyle = pal.rL("green", 1);
    g.fill();
    drawIcon(g, "check", 15, 15, 17, "#ffffff");
  });

  // ---- layout state --------------------------------------------------------------------
  let W = 0, H = 0, bs = 1, lite = false;
  let lanesY: Float32Array[] = [];
  let lanePaths: Path2D[] = [];
  let funnel = new Path2D();
  let gateRings = new Path2D();
  let links = new Path2D();
  let sx: number[] = [];
  let stageS: number[] = [];
  let srcPos: Pt[] = [];
  let tgtPos: Pt[] = [];
  let particles: Particle[] = [];
  const rings: Ring[] = [];
  const pops: { x: number; y: number; t: number }[] = [];
  const waves: { x: number; y: number; t: number }[] = [];
  let boost = 0;
  let dash = 0;

  const xAt = (s: number) => -0.02 * W + 1.04 * W * s;
  const laneY = (k: number, s: number) => {
    const a = lanesY[k];
    const x = clamp01(s) * (NP - 1);
    const i = Math.min(NP - 2, Math.floor(x));
    return a[i] + (a[i + 1] - a[i]) * (x - i);
  };

  const fresh = (init: boolean): Particle => {
    const r = Math.random();
    let fate = FATE_CUM.findIndex((c) => r < c);
    if (fate < 0) fate = N_STAGE - 1;
    const p: Particle = {
      lane: Math.floor(Math.random() * LANES),
      s: init ? Math.random() * 0.9 : -Math.random() * 0.3,
      sp: 0.03 + Math.random() * 0.035,
      fate,
      v: Math.floor(Math.random() * CHIP_HUES.length),
      ph: Math.random() * TAU,
      last: -1,
    };
    while (p.last + 1 < N_STAGE && stageS[p.last + 1] <= p.s) p.last++;
    if (p.fate < p.last) p.fate = N_STAGE - 1;
    return p;
  };

  const addRing = (x: number, y: number, t: number, c: AtsCol) => {
    rings.push({ x, y, t, c });
    if (rings.length > 36) rings.shift();
  };

  return {
    resize(w, h, l) {
      W = w;
      H = h;
      lite = l;
      bs = Math.max(0.55, Math.min(1.05, Math.min(W / 1300, H / 760)));
      const mid = H * 0.5;

      lanesY = Array.from({ length: LANES }, (_, k) => {
        const a = new Float32Array(NP);
        const ys = H * (0.16 + (0.68 * k) / (LANES - 1));
        const ye = mid + (k - (LANES - 1) / 2) * H * 0.03;
        for (let i = 0; i < NP; i++) {
          const s = i / (NP - 1);
          const e = s * s * (3 - 2 * s);
          a[i] = ys + (ye - ys) * e + Math.sin(s * TAU * 1.3 + LANE_PH[k]) * H * 0.022 * (1 - 0.5 * s);
        }
        return a;
      });
      lanePaths = lanesY.map((a) => {
        const p = new Path2D();
        for (let i = 0; i < NP; i++) {
          const x = xAt(i / (NP - 1));
          if (i) p.lineTo(x, a[i]);
          else p.moveTo(x, a[i]);
        }
        return p;
      });
      funnel = new Path2D();
      for (let i = 0; i < NP; i++) {
        const x = xAt(i / (NP - 1));
        if (i) funnel.lineTo(x, lanesY[0][i]);
        else funnel.moveTo(x, lanesY[0][i]);
      }
      for (let i = NP - 1; i >= 0; i--) funnel.lineTo(xAt(i / (NP - 1)), lanesY[LANES - 1][i]);
      funnel.closePath();

      sx = STAGES.map((s) => s.fx * W);
      stageS = STAGES.map((s) => (s.fx + 0.02) / 1.04);

      gateRings = new Path2D();
      const gr = 4 * bs + 1;
      for (let j = 0; j < N_STAGE; j++) {
        for (let k = 0; k < LANES; k++) {
          const y = laneY(k, stageS[j]);
          gateRings.moveTo(sx[j] + gr, y);
          gateRings.arc(sx[j], y, gr, 0, TAU);
        }
      }

      // endpoints
      const ex = Math.max(46 * bs + 6, Math.min(W * 0.045, 90));
      srcPos = [
        { x: ex, y: H * 0.22 },
        { x: ex, y: H * 0.78 },
      ];
      const tx = Math.min(W * 0.965, W - 46 * bs - 6);
      tgtPos = [
        { x: tx, y: mid - H * 0.19 },
        { x: tx, y: mid },
        { x: tx, y: mid + H * 0.19 },
      ];
      links = new Path2D();
      const SS = 0.1;
      srcPos.forEach((p, i) => {
        const ks = i === 0 ? [0, 1, 2] : [4, 5, 6];
        ks.forEach((k) => {
          const ex2 = xAt(SS);
          const ey2 = laneY(k, SS);
          links.moveTo(p.x, p.y);
          links.quadraticCurveTo((p.x + ex2) / 2, p.y, ex2, ey2);
        });
      });
      tgtPos.forEach((p) => {
        links.moveTo(sx[N_STAGE - 1], mid);
        links.quadraticCurveTo((sx[N_STAGE - 1] + p.x) / 2, mid, p.x, p.y);
      });

      const n = lite ? 26 : 52;
      if (particles.length !== n) particles = Array.from({ length: n }, () => fresh(true));
    },

    pointer(x, y, t) {
      waves.push({ x, y, t });
      if (waves.length > 3) waves.shift();
      boost = 1;
    },

    draw(f) {
      const { t, dt, mix } = f;
      pal.update(mix);
      boost *= Math.exp(-dt * 1.2);
      dash += dt * 16 * (1 + boost * 2.2);
      const cs = bs * 1.05;

      // 1) funnel wash
      const fg = ctx.createLinearGradient(0, 0, W, 0);
      fg.addColorStop(0, rg("sky", 0.05 + 0.03 * mix));
      fg.addColorStop(0.6, rg("indigo", 0.08 + 0.03 * mix));
      fg.addColorStop(1, rg("green", 0.09 + 0.03 * mix));
      ctx.fillStyle = fg;
      ctx.fill(funnel);

      // 2) flowing dashed lanes
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, rg("sky", 0.55));
      lg.addColorStop(0.55, rg("indigo", 0.5));
      lg.addColorStop(1, rg("green", 0.6));
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([5, 9]);
      ctx.lineDashOffset = -dash;
      for (const p of lanePaths) ctx.stroke(p);

      // 3) gate lines + gate nodes
      ctx.setLineDash([2, 8]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = rg("ink", 0.18);
      ctx.beginPath();
      for (const x of sx) {
        ctx.moveTo(x, H * 0.17);
        ctx.lineTo(x, H);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rg("panel", 0.92);
      ctx.fill(gateRings);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rg("ink", 0.4);
      ctx.stroke(gateRings);

      // 4) connector curves (sources and targets)
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = -dash * 0.5;
      ctx.strokeStyle = rg("ink", 0.26);
      ctx.stroke(links);
      ctx.setLineDash([]);

      // 5) badges
      const bw = 92 * bs, bh = 84 * bs;
      STAGES.forEach((_, j) => blit(ctx, stageBadges[j], mix, sx[j] - 46 * bs, H * 0.085 - 30 * bs, bw, bh, 0.95));
      srcPos.forEach((p, i) => blit(ctx, srcBadges[i], mix, p.x - 46 * bs, p.y - 30 * bs, bw, bh, 0.95));
      tgtPos.forEach((p, i) => blit(ctx, tgtBadges[i], mix, p.x - 46 * bs, p.y - 30 * bs, bw, bh, 0.95));

      // 6) gate pulses
      while (rings.length && t - rings[0].t > RING_SECONDS) rings.shift();
      ctx.lineWidth = 1.5;
      for (const r of rings) {
        const age = clamp01((t - r.t) / RING_SECONDS);
        ctx.strokeStyle = rg(r.c, (1 - age) * 0.65);
        ctx.beginPath();
        ctx.arc(r.x, r.y, (4 + 18 * age) * bs, 0, TAU);
        ctx.stroke();
      }

      // 7) resume cards riding the lanes
      for (const p of particles) {
        p.s += dt * p.sp * (1 + boost * 2.2);
        const dieS = stageS[p.fate];
        if (p.s > dieS + 0.05) {
          Object.assign(p, fresh(false));
          continue;
        }
        if (p.s < 0) continue;
        while (p.last + 1 < N_STAGE && p.s >= stageS[p.last + 1]) {
          p.last++;
          if (p.last <= p.fate) {
            const gy = laneY(p.lane, stageS[p.last]);
            addRing(sx[p.last], gy, t, STAGES[p.last].col);
            if (p.last === N_STAGE - 1 && p.fate === N_STAGE - 1 && dt > 0) {
              pops.push({ x: sx[p.last], y: gy, t });
              if (pops.length > 12) pops.shift();
            }
          }
        }
        let a = clamp01(p.s / 0.05);
        if (p.s > dieS) a *= 1 - (p.s - dieS) / 0.05;
        const x = xAt(p.s);
        const y = laneY(p.lane, p.s) + Math.sin(t * 1.5 + p.ph) * 2 * bs;
        if (!lite) {
          ctx.fillStyle = rg(CHIP_HUES[p.v], 0.1 * a);
          ctx.beginPath();
          ctx.arc(x, y, 13 * cs, 0, TAU);
          ctx.fill();
        }
        blit(ctx, chips[p.v], mix, x - 11 * cs, y - 14 * cs, 22 * cs, 28 * cs, a * 0.95);
      }

      // 8) hired pops
      while (pops.length && t - pops[0].t > POP_SECONDS) pops.shift();
      for (const pp of pops) {
        const age = clamp01((t - pp.t) / POP_SECONDS);
        const fade = 1 - age;
        ctx.lineWidth = 2;
        ctx.strokeStyle = rg("green", fade * 0.7);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, (6 + 36 * age) * bs, 0, TAU);
        ctx.stroke();
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * TAU + 0.4;
          const d = age * 34 * bs + 6 * bs;
          ctx.fillStyle = rg(k % 2 ? "green" : "amber", fade);
          ctx.beginPath();
          ctx.arc(pp.x + Math.cos(ang) * d, pp.y + Math.sin(ang) * d, 2 * fade + 0.4, 0, TAU);
          ctx.fill();
        }
        const sz = 30 * bs * (0.55 + 0.45 * Math.min(1, age * 4));
        ctx.globalAlpha = fade * fade;
        ctx.drawImage(hiredIcon, pp.x - sz / 2, pp.y - sz / 2 - age * 22 * bs, sz, sz);
        ctx.globalAlpha = 1;
      }

      // 9) click rings
      while (waves.length && t - waves[0].t > 1.6) waves.shift();
      for (const w of waves) {
        const age = clamp01((t - w.t) / 1.6);
        const e = 1 - (1 - age) ** 3;
        ctx.lineWidth = 2;
        ctx.strokeStyle = rg("sky", (1 - age) * 0.6);
        ctx.beginPath();
        ctx.arc(w.x, w.y, e * 300, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = rg("white", (1 - age) * 0.8);
        ctx.beginPath();
        ctx.arc(w.x, w.y, e * 180, 0, TAU);
        ctx.stroke();
      }
    },
  };
};

export function TalentFlowBackground({ interactive = true }: { interactive?: boolean }) {
  const ref = useAtsBackground(create, interactive);
  return (
    <BgShell
      id="tf-bg"
      canvasRef={ref}
      light="radial-gradient(1100px 650px at 100% 0%,rgba(34,197,94,.10),transparent 60%),radial-gradient(900px 600px at 0% 100%,rgba(56,189,248,.14),transparent 60%),linear-gradient(180deg,#FAFCFF,#F0F5FE)"
      dark="radial-gradient(1100px 650px at 100% 0%,rgba(34,197,94,.16),transparent 60%),radial-gradient(900px 600px at 0% 100%,rgba(56,189,248,.18),transparent 60%),linear-gradient(180deg,#060A16,#0A1226)"
    />
  );
}

/* ---------------------------------------------------------------
USAGE  (needs ats-bg-engine.tsx next to this file, and next-themes)

// app/providers.tsx  (client)  -- skip if you already have ThemeProvider (shadcn does)
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
<html lang="en" suppressHydrationWarning>
  <body>
    <Providers>
      <TalentFlowBackground />
      {children}
    </Providers>
  </body>
</html>

// Frosted cards (Tailwind):
<div className="rounded-2xl border border-white/60 bg-white/60 p-6 backdrop-blur-xl
                dark:border-white/10 dark:bg-slate-950/50">...</div>
---------------------------------------------------------------- */