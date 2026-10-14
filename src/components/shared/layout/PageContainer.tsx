// src/components/shared/layout/PageContainer.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * "default" centres the content and caps it at 1440px so it stays readable on wide
     * monitors; "full" lets it use the whole width (e.g. for tables or boards).
     */
    width?: "default" | "full";
}

/**
 * The scrolling content area under a portal page header. The <main> stays full-bleed so the
 * soft backdrop runs edge to edge, while an inner wrapper holds the padding and max width.
 * Server-component friendly (no hooks).
 */
export function PageContainer({ width = "default", className, children, ...props }: PageContainerProps) {
    return (
        <main
            id="main-content"
            className={cn(
                "client-canvas min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]",
                className
            )}
            {...props}
        >
            <div className={cn("w-full p-4 sm:p-8", width === "default" && "mx-auto max-w-[1440px]")}>
                {children}
            </div>
        </main>
    );
}
