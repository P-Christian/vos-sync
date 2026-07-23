"use client";

import { useEffect } from "react";

export function BfCacheBuster() {
    useEffect(() => {
        // This event fires when the page is restored from the browser's Back/Forward Cache (bfcache).
        // Since we did a hard redirect on logout (window.location.href), navigating back restores the old document state.
        // We force a hard reload so the request hits middleware.ts, which will properly enforce the role logic.
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };

        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    return null;
}
