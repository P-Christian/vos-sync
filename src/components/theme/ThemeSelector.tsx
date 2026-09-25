/* eslint-disable react-hooks/set-state-in-effect */
// src/components/theme/ThemeSelector.tsx
"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeCurtain } from "./useThemeCurtain";

export function ThemeSelector() {
  const { theme } = useTheme();
  const { switchTheme } = useThemeCurtain();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme ?? "system" : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 rounded-xl border-border/80 bg-background/80 shadow-xs backdrop-blur-xs transition-all hover:bg-muted/80 hover:scale-105 active:scale-95 focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all text-amber-500 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all text-blue-400 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40 rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-lg backdrop-blur-md"
      >
        <DropdownMenuItem
          onClick={() => switchTheme("light")}
          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
            currentTheme === "light"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Light</span>
          </div>
          {currentTheme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => switchTheme("dark")}
          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
            currentTheme === "dark"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-blue-400" />
            <span>Dark</span>
          </div>
          {currentTheme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => switchTheme("system")}
          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
            currentTheme === "system"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            <span>System</span>
          </div>
          {currentTheme === "system" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
