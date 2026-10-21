import type { Metadata } from "next";
import PrivacyPolicy from "@/modules/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy | VOS Sync",
  description: "Read the Privacy Policy of VOS Sync. Learn how we collect, protect, and use your personal information on our platform.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
