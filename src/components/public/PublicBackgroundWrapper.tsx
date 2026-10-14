"use client";

import { usePathname } from "next/navigation";
import { NetworkBackground } from "@/components/public/NetworkBackground";

export function PublicBackgroundWrapper() {
  const pathname = usePathname();

  // Keep test-background sandbox isolated for evaluating distinct background variants
  if (pathname?.startsWith("/test-background")) {
    return null;
  }

  return <NetworkBackground />;
}
