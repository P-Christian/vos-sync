/* eslint-disable react-hooks/set-state-in-effect */
// src/components/theme/ThemeToggleButton.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeCurtain } from "./useThemeCurtain";

export default function ThemeToggleButton({
    variant = "outline",
    size = "sm",
    className,
}: {
    variant?: "default" | "secondary" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    transitionMs?: number;
}) {
    const { theme, systemTheme } = useTheme();
    const { switchTheme, isTransitioning } = useThemeCurtain();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const current = theme === "system" ? systemTheme : theme;
    const isDark = current === "dark";

    const onToggle = () => {
        switchTheme(isDark ? "light" : "dark");
    };

    if (!mounted) {
        return (
            <Button variant={variant} size={size} className={className} disabled>
                <Sun className="mr-2 h-4 w-4" />
                Theme
            </Button>
        );
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
            onClick={onToggle}
            disabled={isTransitioning}
            aria-label="Toggle theme"
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light mode" : "Dark mode"}
        </Button>
    );
}
