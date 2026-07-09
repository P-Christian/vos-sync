import type { Metadata } from "next";
import AboutUs from "@/modules/about-us";

export const metadata: Metadata = {
  title: "About Us | VosSync",
  description: "Learn about VosSync's mission to make job searching faster, fairer, and more human. Our story, values, and the team behind the platform.",
};

export default function AboutUsPage() {
  return <AboutUs />;
}
