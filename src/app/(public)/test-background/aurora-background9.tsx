"use client";

import { useEffect, useRef } from "react";

/**
 * Design 9 — Sunset Plasma
 *
 * Warm orange / pink / violet plasma blobs flow and breathe across a deep sunset gradient.
 *  - Multi-waypoint aurora paths (pure CSS keyframes, no JS per frame)
 *  - Soft radial-gradient blobs: flame orange, hot pink, coral, violet
 *  - Mouse: warm amber glow halo follows cursor
 *  - pointer-events: none — never blocks UI clicks
 *  - One rAF loop; no React state updates on each frame
 */

const CSS = `
@keyframes sp-p1{0%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}18%{transform:translate3d(10vw,6vh,0) rotate(8deg) scale(1.14);animation-timing-function:cubic-bezier(.4,0,.2,1)}40%{transform:translate3d(-6vw,13vh,0) rotate(-5deg) scale(0.91)}62%{transform:translate3d(-14vw,4vh,0) rotate(11deg) scale(1.18)}82%{transform:translate3d(5vw,-8vh,0) rotate(-4deg) scale(1.06)}100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}}
@keyframes sp-p2{0%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}25%{transform:translate3d(-12vw,-5vh,0) rotate(-9deg) scale(1.22);animation-timing-function:cubic-bezier(.7,0,.3,1)}48%{transform:translate3d(8vw,-11vh,0) rotate(6deg) scale(0.87)}70%{transform:translate3d(14vw,6vh,0) rotate(-12deg) scale(1.16)}90%{transform:translate3d(-5vw,9vh,0) rotate(4deg) scale(1.09)}100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}}
@keyframes sp-p3{0%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}22%{transform:translate3d(11vw,9vh,0) rotate(7deg) scale(1.1)}50%{transform:translate3d(-9vw,4vh,0) rotate(-8deg) scale(1.2);animation-timing-function:cubic-bezier(.2,.6,.4,1)}73%{transform:translate3d(4vw,-12vh,0) rotate(10deg) scale(0.93)}100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}}
@keyframes sp-p4{0%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}30%{transform:translate3d(-13vw,-9vh,0) rotate(-11deg) scale(1.17)}55%{transform:translate3d(6vw,-5vh,0) rotate(9deg) scale(0.9);animation-timing-function:cubic-bezier(.5,0,.1,1)}78%{transform:translate3d(12vw,10vh,0) rotate(-7deg) scale(1.13)}100%{transform:translate3d(0,0,0) rotate(0deg) scale(1)}}
@keyframes sp-breathe{from{opacity:.55}to{opacity:1}}
@keyframes sp-orb-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.06)}}
.sp-root{position:fixed;inset:0;z-index:-10;overflow:hidden;pointer-events:none;contain:strict;
  background:linear-gradient(170deg,#1a0526 0%,#3d0c2a 25%,#7a1a2e 55%,#c4522a 80%,#e8832a 100%)}
.sp-blob{position:absolute;border-radius:50%;will-change:transform,opacity}
.sp-orb{position:absolute;border-radius:50%;will-change:transform,opacity;
  animation:sp-orb-float var(--ft,12s) ease-in-out infinite}
.sp-glow{position:absolute;border-radius:50%;pointer-events:none;will-change:transform,opacity;
  transition:opacity .35s;mix-blend-mode:screen}
@media(prefers-reduced-motion:reduce){.sp-blob,.sp-orb{animation:none}.sp-glow{display:none}}
`;

interface BlobDef {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  width: string;
  height: string;
  c: string;
  a: number;
  anim: string;
  dl: string;
}

export function AuroraBackground({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  // Inject CSS once
  useEffect(() => {
    const id = "sp-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  // Mouse amber glow
  useEffect(() => {
    const root = rootRef.current;
    const glow = glowRef.current;
    if (!root || !glow) return;

    const GLOW = 420;
    glow.style.width = `${GLOW}px`;
    glow.style.height = `${GLOW}px`;
    glow.style.background = `radial-gradient(closest-side, rgba(255,160,50,.28) 0%, rgba(255,80,120,.15) 50%, transparent 100%)`;

    let cx = -9999, cy = -9999;
    let tx = -9999, ty = -9999;

    function onMove(e: MouseEvent) {
      tx = e.clientX;
      ty = e.clientY;
      activeRef.current = true;
      if (!rafRef.current) tick();
    }
    function onLeave() {
      activeRef.current = false;
    }

    function tick() {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      if (glow) {
        glow.style.transform = `translate3d(${cx - GLOW / 2}px,${cy - GLOW / 2}px,0)`;
        glow.style.opacity = activeRef.current ? "1" : "0";
      }
      const dist = Math.hypot(tx - cx, ty - cy);
      if (dist > 0.5 || activeRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    }

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const blobs: BlobDef[] = [
    { left: "-10%", top: "-20%", width: "80vw", height: "65vh", c: "255,80,30", a: 0.45, anim: "sp-p1 43s linear infinite, sp-breathe 14s ease-in-out infinite alternate", dl: "0s" },
    { right: "-15%", top: "-10%", width: "72vw", height: "58vh", c: "255,30,120", a: 0.5, anim: "sp-p2 57s linear infinite, sp-breathe 18s ease-in-out infinite alternate", dl: "-9s" },
    { left: "12%", bottom: "-28%", width: "88vw", height: "62vh", c: "240,100,180", a: 0.38, anim: "sp-p3 63s linear infinite, sp-breathe 12s ease-in-out infinite alternate", dl: "-16s" },
    { left: "32%", top: "22%", width: "52vw", height: "42vh", c: "255,200,50", a: 0.32, anim: "sp-p4 31s linear infinite, sp-breathe 10s ease-in-out infinite alternate", dl: "-6s" },
    { right: "8%", bottom: "8%", width: "48vw", height: "42vh", c: "160,20,200", a: 0.26, anim: "sp-p2 49s linear infinite, sp-breathe 16s ease-in-out infinite alternate", dl: "-22s" },
  ];

  // Floating orbs
  const orbs = [
    { left: "7%", top: "16%", size: 200, c: "255,120,40", a: 0.18, ft: "14s", dl: "0s" },
    { left: "72%", top: "10%", size: 80, c: "255,60,140", a: 0.28, ft: "11s", dl: "-4s" },
    { left: "82%", top: "58%", size: 130, c: "200,40,80", a: 0.22, ft: "17s", dl: "-7s" },
    { left: "18%", top: "68%", size: 120, c: "255,180,30", a: 0.2, ft: "9s", dl: "-2s" },
    { left: "50%", top: "6%", size: 65, c: "255,80,180", a: 0.3, ft: "13s", dl: "-5s" },
    { left: "44%", top: "78%", size: 50, c: "255,140,60", a: 0.35, ft: "8s", dl: "-9s" },
  ];

  return (
    <div ref={rootRef} className={`sp-root ${className}`} aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="sp-blob"
          style={{
            left: b.left,
            right: b.right,
            top: b.top,
            bottom: b.bottom,
            width: b.width,
            height: b.height,
            background: `radial-gradient(closest-side, rgba(${b.c},${b.a}), rgba(${b.c},0))`,
            animation: b.anim,
            animationDelay: b.dl,
          }}
        />
      ))}
      {orbs.map((o, i) => (
        <div
          key={i}
          className="sp-orb"
          style={{
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,.85) 0%, rgba(${o.c},${o.a + 0.5}) 40%, rgba(${o.c},0) 100%)`,
            "--ft": o.ft,
            animationDelay: o.dl,
          } as unknown as React.CSSProperties}
        />
      ))}
      <div ref={glowRef} className="sp-glow" style={{ opacity: 0 }} />
    </div>
  );
}
