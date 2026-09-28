// src/components/theme/ThemeProvider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeCurtainProvider } from "./ThemeCurtainProvider";

export default function ThemeProvider({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <ThemeCurtainProvider>
                {children}
            </ThemeCurtainProvider>
        </NextThemesProvider>
    );
}
