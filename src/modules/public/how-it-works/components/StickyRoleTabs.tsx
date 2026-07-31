// src/modules/public/how-it-works/components/StickyRoleTabs.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, GraduationCap } from "lucide-react";
import { RoleKey } from "../types";

interface Props {
  activeRole: RoleKey;
  onSelectRole: (role: RoleKey) => void;
  overviewId?: string;
}

export function StickyRoleTabs({
  activeRole,
  onSelectRole,
  overviewId = "quick-overview-section",
}: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById(overviewId);
      if (!el) {
        setIsVisible(true);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Show sticky tabs when Quick Overview is scrolled past the top navigation bar (~120px)
      setIsVisible(rect.bottom < 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [overviewId]);

  const tabs = [
    {
      key: "employee" as RoleKey,
      label: "Employee",
      icon: <User className="h-4 w-4" />,
      activeClass: "bg-blue-600 text-white shadow-md",
    },
    {
      key: "employer" as RoleKey,
      label: "Employer",
      icon: <Building2 className="h-4 w-4" />,
      activeClass: "bg-emerald-600 text-white shadow-md",
    },
    {
      key: "school" as RoleKey,
      label: "School",
      icon: <GraduationCap className="h-4 w-4" />,
      activeClass: "bg-amber-600 text-white shadow-md",
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-16 left-0 right-0 z-30 bg-background/90 backdrop-blur-md border-y py-3 px-4 shadow-xs"
        >
          <div className="max-w-3xl mx-auto">
            {/* Segmented Control Bar */}
            <div className="bg-muted/60 p-1.5 rounded-2xl grid grid-cols-3 gap-1 border">
              {tabs.map((tab) => {
                const isActive = activeRole === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onSelectRole(tab.key)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? tab.activeClass
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
