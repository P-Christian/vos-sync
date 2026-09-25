// src/components/theme/ThemeCurtain.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor, Sparkles } from "lucide-react";

interface ThemeCurtainProps {
  isOpen: boolean;
  targetTheme: string | null;
}

export function ThemeCurtain({ isOpen, targetTheme }: ThemeCurtainProps) {
  const isLight = targetTheme === "light";
  const isDark = targetTheme === "dark";

  const themeLabel = isDark
    ? "Dark Mode"
    : isLight
    ? "Light Mode"
    : "System Mode";

  // 100% solid, non-transparent background colors
  const panelBg = isLight
    ? "bg-[#f8fafc] border-slate-300"
    : "bg-[#09090b] border-zinc-800";

  const glowGradientTop = isLight
    ? "bg-gradient-to-b from-amber-400/25 via-orange-400/5 to-transparent"
    : "bg-gradient-to-b from-blue-500/25 via-indigo-500/5 to-transparent";

  const glowGradientBottom = isLight
    ? "bg-gradient-to-t from-amber-400/25 via-orange-400/5 to-transparent"
    : "bg-gradient-to-t from-blue-500/25 via-indigo-500/5 to-transparent";

  const badgeCardStyle = isLight
    ? "border-slate-300 bg-white text-slate-900 shadow-2xl shadow-slate-900/10"
    : "border-white/15 bg-[#18181b] text-white shadow-2xl shadow-black/60";

  const iconContainerStyle = isLight
    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
    : isDark
    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
    : "bg-primary/20 text-primary border border-primary/30";

  const subtitleColor = isLight ? "text-slate-500" : "text-zinc-400";
  const titleColor = isLight ? "text-slate-950" : "text-white";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center overflow-hidden">
          {/* Top Curtain Panel (100% Solid Opaque) */}
          <motion.div
            key="curtain-top"
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`absolute top-0 left-0 right-0 h-[calc(50%+1px)] border-b ${panelBg} shadow-2xl z-0`}
          >
            <div className={`absolute inset-0 ${glowGradientTop}`} />
          </motion.div>

          {/* Bottom Curtain Panel (100% Solid Opaque) */}
          <motion.div
            key="curtain-bottom"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`absolute bottom-0 left-0 right-0 h-[calc(50%+1px)] border-t ${panelBg} shadow-2xl z-0`}
          >
            <div className={`absolute inset-0 ${glowGradientBottom}`} />
          </motion.div>

          {/* Center Content Badge */}
          <motion.div
            key="curtain-badge"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{
              duration: 0.35,
              delay: 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`relative z-10 flex flex-col items-center justify-center gap-4 rounded-3xl border px-8 py-7 ${badgeCardStyle}`}
          >
            <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${iconContainerStyle}`}>
              {isDark ? (
                <motion.div
                  initial={{ rotate: -40, scale: 0.7 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Moon className="h-8 w-8 text-blue-400" />
                </motion.div>
              ) : isLight ? (
                <motion.div
                  initial={{ rotate: 120, scale: 0.7 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Sun className="h-8 w-8 text-amber-500" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Monitor className="h-8 w-8 text-primary" />
                </motion.div>
              )}

              <Sparkles
                className={`absolute -top-1 -right-1 h-4 w-4 animate-pulse ${
                  isLight ? "text-amber-500" : "text-blue-400"
                }`}
              />
            </div>

            <div className="text-center space-y-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${subtitleColor}`}>
                Transitioning Display
              </p>
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${titleColor}`}>
                Switching to {themeLabel}
              </h2>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
