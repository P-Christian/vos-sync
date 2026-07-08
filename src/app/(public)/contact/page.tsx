import type { Metadata } from "next";
import Contact from "@/modules/contact";

export const metadata: Metadata = {
  title: "Contact Us | VosSync",
  description: "Get in touch with the VosSync team. We're here to help with hiring, job searching, and any questions you have.",
};

export default function ContactPage() {
  return <Contact />;
}
