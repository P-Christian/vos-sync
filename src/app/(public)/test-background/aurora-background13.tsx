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
  useAtsBackground,
  type AtsCol,
  type IconName,
  type SceneFactory,
} from "./ats-bg-engine";

/**
 * HiringHub: the whole ATS ecosystem as an orbit system.
 *
 *   <HiringHubBackground />                      // click/tap = a broadcast ring through the network
 *   <HiringHubBackground interactive={false} />
 *
 * The ATS is the glowing hub in the middle. Three tilted orbits carry the five parties:
 * Schools, Job seekers, Employers, Companies and HR systems (integrations). Documents,
 * mail, chat and "hired" checks travel along the spokes in both directions, little candidate
 * dots circle on the orbits, and the hub broadcasts soft pulses.
 *
 * Layers: centre glow > sparkle marks > dashed orbits > hub pulses > spokes > packets >
 *         back half of the orbit (badges + dots) > hub > front half > click rings
 * Depth: badges grow and brighten as they swing to the front of the orbit.
 *
 * Performance: all icons are sprites baked once, 5 badges + 44 dots (24 in lite mode),
 * no per-frame allocation except gradients, one rAF loop (see ats-bg-engine.tsx).
 * Light + dark via next-themes. Needs <ThemeProvider> above it.
 */

const SATS: { icon: IconName; col: AtsCol; label: string; ring: number; a0: number }[] = [
  { icon: "cap", col: "violet", label: "Schools", ring: 0, a0: 0.6 },
  { icon: "person", col: "sky", label: "Job seekers", ring: 1, a0: 3.4 },
  { icon: "briefcase", col: "blue", label: "Employers", ring: 1, a0: 0.25 },
  { icon: "building", col: "indigo", label: "Companies", ring: 2, a0: 1.9 },
  { icon: "plug", col: "green", label: "HR systems", ring: 2, a0: 5.0 },
];
const RING_SPEED = [0.14, -0.09, 0.06]; // rad/s
const PACKETS: { icon: IconName; col: AtsCol }[] = [
  { icon: "doc", col: "sky" },
  { icon: "mail", col: "violet" },
  { icon: "chat", col: "indigo" },
  { icon: "check", col: "green" },
];
const DOT_COLS: AtsCol[] = ["sky", "cyan", "indigo", "violet", "pink", "green", "amber"];
const WAVE_REACH = 520;
const WAVE_SECONDS = 1.8;

interface Dot {
  ring: number;
  a0: number;
  sp: number;
  r: number;
  c: AtsCol;
  rj: number;
}
interface Packet {
  sat: number;
  p: number;
  sp: number;
  dir: number;
  k: number;
}

const create: SceneFactory = (ctx) => {
  const pal = createPalette();
  const rg = pal.rg;

  // ---- sprites, once -------------------------------------------------------------------
  const badges = SATS.map((s) => makeBadge(pal, s.icon, s.col, s.label));
  const pkt = PACKETS.map((p) =>
    dualSprite(20, 20, (g, dark) => {
      const c = dark ? pal.rD : pal.rL;
      g.beginPath();
      g.arc(10, 10, 9, 0, TAU);
      g.fillStyle = c("panel", 0.95);
      g.fill();
      g.lineWidth = 1.3;
      g.strokeStyle = c(p.col, 0.85);
      g.stroke();
      drawIcon(g, p.icon, 10, 10, 11, c(p.col, 1));
    }),
  );

  // ---- layout state --------------------------------------------------------------------
  let W = 0, H = 0, cx = 0, cy = 0, tilt = 0.58, bs = 1, lite = false;
  const R = [0, 0, 0];
  let dots: Dot[] = [];
  let packets: Packet[] = [];
  const marks = Array.from({ length: 16 }, () => ({
    fx: Math.random(),
    fy: Math.random(),
    sz: 4 + Math.random() * 5,
    sp: 0.3 + Math.random() * 0.5,
    ph: Math.random() * TAU,
  }));
  const waves: { x: number; y: number; t: number }[] = [];
  const sp = SATS.map(() => ({ x: 0, y: 0, z: 0, fl: 0 }));
  let kick = 0;
  let dash = 0;

  const ringPos = (ring: number, a: number, rj = 1) => ({
    x: cx + Math.cos(a) * R[ring] * rj,
    y: cy + Math.sin(a) * R[ring] * rj * tilt,
    z: Math.sin(a),
  });

  return {
    resize(w, h, l) {
      W = w;
      H = h;
      lite = l;
      cx = W * 0.5;
      cy = H * 0.52;
      tilt = W < H ? 0.78 : 0.56;
      const r3 = Math.min(W * 0.46, (H * 0.44) / tilt);
      R[2] = r3;
      R[1] = r3 * 0.7;
      R[0] = r3 * 0.42;
      bs = Math.max(0.55, Math.min(1.05, Math.min(W / 1300, H / 760)));

      const n = lite ? 24 : 44;
      dots = Array.from({ length: n }, () => {
        const ring = Math.floor(Math.random() * 3);
        return {
          ring,
          a0: Math.random() * TAU,
          sp: RING_SPEED[ring] * (0.7 + Math.random() * 0.6),
          r: 1.4 + Math.random() * 1.8,
          c: DOT_COLS[Math.floor(Math.random() * DOT_COLS.length)],
          rj: 1 + (Math.random() - 0.5) * 0.07,
        };
      });
      packets = SATS.flatMap((_, i) =>
        [0, 1].map((j) => ({
          sat: i,
          p: Math.random(),
          sp: 0.16 + Math.random() * 0.2,
          dir: j === 0 ? 1 : -1,
          k: Math.floor(Math.random() * PACKETS.length),
        })),
      );
    },

    pointer(x, y, t) {
      waves.push({ x, y, t });
      if (waves.length > 3) waves.shift();
      kick = 1;
    },

    draw(f) {
      const { t, dt, mix } = f;
      pal.update(mix);
      kick *= Math.exp(-dt * 2);
      dash += dt * 10;
      while (waves.length && t - waves[0].t > WAVE_SECONDS) waves.shift();

      // satellite positions + click flash (computed once per frame)
      SATS.forEach((s, i) => {
        const q = ringPos(s.ring, s.a0 + RING_SPEED[s.ring] * t);
        let fl = 0;
        for (const w of waves) {
          const age = clamp01((t - w.t) / WAVE_SECONDS);
          const reach = (1 - (1 - age) ** 3) * WAVE_REACH;
          const d = Math.hypot(q.x - w.x, q.y - w.y);
          fl = Math.max(fl, Math.exp(-(((d - reach) / 44) ** 2)) * (1 - age));
        }
        sp[i].x = q.x;
        sp[i].y = q.y;
        sp[i].z = q.z;
        sp[i].fl = fl;
      });

      // 1) centre glow
      const gr = R[2] * 1.3;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      glow.addColorStop(0, rg("sky", 0.2 + 0.08 * mix));
      glow.addColorStop(0.5, rg("indigo", 0.08 + 0.05 * mix));
      glow.addColorStop(1, rg("indigo", 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, gr, 0, TAU);
      ctx.fill();

      // 2) sparkle marks
      ctx.lineWidth = 1.4;
      for (const m of marks) {
        const a = Math.max(0, Math.sin(t * m.sp + m.ph)) ** 2;
        if (a < 0.05) continue;
        const x = m.fx * W, y = m.fy * H, L = m.sz * (0.6 + 0.4 * a);
        ctx.strokeStyle = rg("sky", a * 0.7);
        ctx.beginPath();
        ctx.moveTo(x - L, y);
        ctx.lineTo(x + L, y);
        ctx.moveTo(x, y - L);
        ctx.lineTo(x, y + L);
        ctx.stroke();
      }

      // 3) dashed orbits
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 9]);
      for (let k = 0; k < 3; k++) {
        ctx.lineDashOffset = -dash * (k % 2 ? -1 : 1) * (1 + k * 0.3);
        ctx.strokeStyle = rg("ink", 0.2 - k * 0.03);
        ctx.beginPath();
        ctx.ellipse(cx, cy, R[k], R[k] * tilt, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 4) hub broadcast pulses
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const age = (t / 2.8 + k / 3) % 1;
        const rr0 = R[2] * 1.08 * age;
        ctx.strokeStyle = rg("sky", (1 - age) ** 1.6 * 0.34);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr0, rr0 * tilt, 0, 0, TAU);
        ctx.stroke();
      }

      // 5) spokes
      ctx.lineWidth = 1.2;
      SATS.forEach((s, i) => {
        const g = ctx.createLinearGradient(cx, cy, sp[i].x, sp[i].y);
        g.addColorStop(0, rg(s.col, 0.05));
        g.addColorStop(1, rg(s.col, 0.38 + sp[i].fl * 0.4));
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sp[i].x, sp[i].y);
        ctx.stroke();
      });

      // 6) packets travelling along the spokes
      const ps = 20 * bs;
      for (const k of packets) {
        k.p += dt * k.sp;
        if (k.p >= 1) {
          k.p -= 1;
          k.k = Math.floor(Math.random() * PACKETS.length);
        }
        const u = k.dir > 0 ? k.p : 1 - k.p;
        const x = cx + (sp[k.sat].x - cx) * u;
        const y = cy + (sp[k.sat].y - cy) * u;
        const edge = Math.sin(k.p * Math.PI);
        if (!lite) {
          ctx.fillStyle = rg(PACKETS[k.k].col, 0.12 * edge);
          ctx.beginPath();
          ctx.arc(x, y, ps * 0.9, 0, TAU);
          ctx.fill();
        }
        blit(ctx, pkt[k.k], mix, x - ps / 2, y - ps / 2, ps, ps, edge);
      }

      // ---- depth-sorted pass: back half, hub, front half ---------------------------------
      const drawSide = (front: boolean) => {
        for (const d of dots) {
          const q = ringPos(d.ring, d.a0 + d.sp * t, d.rj);
          if (q.z >= 0 !== front) continue;
          const dep = (q.z + 1) / 2;
          ctx.fillStyle = rg(d.c, 0.4 + 0.5 * dep);
          ctx.beginPath();
          ctx.arc(q.x, q.y, d.r * (0.8 + 0.4 * dep) * bs + 0.4, 0, TAU);
          ctx.fill();
        }
        SATS.forEach((s, i) => {
          const o = sp[i];
          if (o.z >= 0 !== front) return;
          const dep = (o.z + 1) / 2;
          const sc = bs * (0.82 + 0.22 * dep) * (1 + 0.22 * o.fl);
          if (o.fl > 0.04) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = rg(s.col, o.fl * 0.8);
            ctx.beginPath();
            ctx.arc(o.x, o.y, 38 * sc, 0, TAU);
            ctx.stroke();
          }
          blit(ctx, badges[i], mix, o.x - 46 * sc, o.y - 30 * sc, 92 * sc, 84 * sc, 0.62 + 0.38 * dep);
        });
      };

      drawSide(false);

      // hub
      const hr = 36 * bs * (1 + 0.1 * kick);
      ctx.fillStyle = rg("sky", 0.16);
      ctx.beginPath();
      ctx.arc(cx, cy, hr * 1.8, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, hr, 0, TAU);
      ctx.fillStyle = rg("panel", 0.92);
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = rg("indigo", 0.85);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rg("sky", 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, hr * 0.78, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.strokeStyle = rg("cyan", 0.85);
      ctx.beginPath();
      ctx.arc(cx, cy, hr * 1.26, t * 1.2, t * 1.2 + 1.4);
      ctx.stroke();
      ctx.strokeStyle = rg("violet", 0.7);
      ctx.beginPath();
      ctx.arc(cx, cy, hr * 1.26, t * 1.2 + Math.PI, t * 1.2 + Math.PI + 0.9);
      ctx.stroke();
      ctx.lineCap = "butt";
      drawIcon(ctx, "check", cx, cy, hr * 0.95, rg("indigo", 1));

      drawSide(true);

      // 7) click rings
      for (const w of waves) {
        const age = clamp01((t - w.t) / WAVE_SECONDS);
        const e = 1 - (1 - age) ** 3;
        ctx.lineWidth = 2;
        ctx.strokeStyle = rg("sky", (1 - age) * 0.6);
        ctx.beginPath();
        ctx.arc(w.x, w.y, e * WAVE_REACH, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = rg("white", (1 - age) * 0.8);
        ctx.beginPath();
        ctx.arc(w.x, w.y, e * WAVE_REACH * 0.55, 0, TAU);
        ctx.stroke();
      }
    },
  };
};

export function HiringHubBackground({ interactive = true }: { interactive?: boolean }) {
  const ref = useAtsBackground(create, interactive);
  return (
    <BgShell
      id="hh-bg"
      canvasRef={ref}
      light="radial-gradient(900px 700px at 50% 52%,rgba(99,102,241,.14),transparent 65%),linear-gradient(180deg,#FBFCFF,#EEF3FD)"
      dark="radial-gradient(900px 700px at 50% 52%,rgba(99,102,241,.30),transparent 65%),linear-gradient(180deg,#05081A,#090F26)"
    />
  );
}

/* ---------------------------------------------------------------
USAGE  (needs ats-bg-engine.tsx next to this file, and next-themes)

// app/layout.tsx  (inside your <ThemeProvider>)
<html lang="en" suppressHydrationWarning>
  <body>
    <Providers>
      <HiringHubBackground />
      {children}
    </Providers>
  </body>
</html>

The hub sits at the centre of the screen. If your hero text is centred, keep a frosted card
behind it (bg-white/60 dark:bg-slate-950/50 backdrop-blur-xl) so the orbit stays calm behind it.
---------------------------------------------------------------- */