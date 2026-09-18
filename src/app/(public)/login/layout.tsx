import type { Metadata } from "next";

export const metadata: Metadata = {
  referrer: "no-referrer",
};

export default function LoginLayout({ children }: { readonly children: React.ReactNode }) {
  return children;
}
