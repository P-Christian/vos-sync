// src/components/theme/ThemeCurtainProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { ThemeCurtain } from "./ThemeCurtain";

interface ThemeCurtainContextType {
  isTransitioning: boolean;
  targetTheme: string | null;
  switchTheme: (newTheme: "light" | "dark" | "system") => void;
}

const ThemeCurtainContext = createContext<ThemeCurtainContextType | undefined>(undefined);

export function ThemeCurtainProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetTheme, setTargetTheme] = useState<string | null>(null);

  const switchTheme = useCallback(
    (newTheme: "light" | "dark" | "system") => {
      if (newTheme === theme && !isTransitioning) return;

      setTargetTheme(newTheme);
      setIsTransitioning(true);

      // Phase 1: Wait for curtains to fully close over the screen (~500ms)
      setTimeout(() => {
        // Phase 2: Switch the underlying theme behind the closed curtain
        setTheme(newTheme);

        // Phase 3: Hold the status card clearly for the user to read and let DOM settle (~550ms)
        setTimeout(() => {
          setIsTransitioning(false);

          // Clear target theme after curtain exit transition completes (~500ms)
          setTimeout(() => {
            setTargetTheme(null);
          }, 500);
        }, 550);
      }, 500);
    },
    [theme, setTheme, isTransitioning]
  );

  return (
    <ThemeCurtainContext.Provider value={{ isTransitioning, targetTheme, switchTheme }}>
      {children}
      <ThemeCurtain isOpen={isTransitioning} targetTheme={targetTheme} />
    </ThemeCurtainContext.Provider>
  );
}

export function useThemeCurtain() {
  const context = useContext(ThemeCurtainContext);
  if (!context) {
    throw new Error("useThemeCurtain must be used within a ThemeCurtainProvider");
  }
  return context;
}
