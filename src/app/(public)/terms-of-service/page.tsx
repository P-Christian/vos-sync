import type { Metadata } from "next";
import TermsOfService from "@/modules/terms-of-service";

export const metadata: Metadata = {
  title: "Terms of Service | VOS Sync",
  description: "Read the Terms of Service for VOS Sync. Learn about our user agreement, platform guidelines, and legal policies.",
};

export default function TermsOfServicePage() {
  return <TermsOfService />;
}
