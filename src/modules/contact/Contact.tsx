import { Mail, Phone, MapPin, Clock, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ==========================================
// MOCK DATA
// ==========================================

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email us",
    value: "hello@vossync.com",
    desc: "We reply within 24 hours.",
    href: "mailto:hello@vossync.com",
  },
  {
    icon: Phone,
    label: "Call us",
    value: "+63 900 000 0000",
    desc: "Mon–Fri, 9am–6pm PHT.",
    href: "tel:+639000000000",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Dagupan City, Philippines",
    desc: "Pangasinan",
    href: "https://www.google.com/maps/place/Vertex+Technologies+Corporation/@16.0811488,120.3628013,806m/data=!3m1!1e3!4m6!3m5!1s0x3391690070819183:0xa97974ead9f524e!8m2!3d16.082358!4d120.360837!16s%2Fg%2F11ms89t5n8?hl=en&entry=ttu",
  },
  {
    icon: Clock,
    label: "Support hours",
    value: "Mon–Fri, 9am–6pm",
    desc: "Philippine Time (PHT)",
    href: "#",
  },
];

const FAQS = [
  {
    q: "How quickly do you respond?",
    a: "Our team typically responds within one business day. For urgent matters, please call us directly.",
  },
  {
    q: "Can I post a job as a company?",
    a: "Yes! Reach out to our employer team or create a company account to start posting jobs immediately.",
  },
  {
    q: "Do you have a talent acquisition team?",
    a: "We work with recruiters and HR teams to source top-tier talent. Send us a message and we'll connect you.",
  },
];

// ==========================================
// COMPONENT
// ==========================================

export default function Contact() {
  return (
    <div className="bg-white text-zinc-950 font-sans pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-20 md:pt-28 md:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-5 py-1.5 px-4 rounded-full shadow-sm bg-white/70 backdrop-blur-sm text-sm">
              <MessageSquare className="w-3.5 h-3.5 mr-2 text-zinc-500" />
              Get in touch
            </Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-6 leading-tight">
              Let&apos;s start a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-900">
                conversation.
              </span>
            </h1>
            <p className="text-lg text-zinc-500 leading-relaxed">
              Whether you&apos;re a job seeker, employer, or just have a question — we&apos;re here to help. Fill out the form and we&apos;ll get back to you soon.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT INFO CARDS */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT_INFO.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group border border-zinc-200 rounded-2xl p-6 bg-white hover:border-zinc-300 hover:shadow-md transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mb-4 group-hover:bg-zinc-900 transition-colors">
                  <item.icon className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">{item.label}</p>
                <p className="text-base font-semibold text-zinc-900 mb-1">{item.value}</p>
                <p className="text-sm text-zinc-500">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FORM + FAQ */}
      <section className="py-16 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            {/* FORM */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Send us a message</h2>
              <p className="text-zinc-500 mb-8 text-sm">We&apos;ll respond within one business day with next steps.</p>

              <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-sm font-medium text-zinc-700">Full name</Label>
                    <Input id="contact-name" placeholder="Your name" className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-medium text-zinc-700">Email</Label>
                    <Input id="contact-email" type="email" placeholder="you@company.com" className="rounded-xl h-11" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="contact-company" className="text-sm font-medium text-zinc-700">Company</Label>
                    <Input id="contact-company" placeholder="Company / Organization" className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-subject" className="text-sm font-medium text-zinc-700">Subject</Label>
                    <Input id="contact-subject" placeholder="e.g. Hiring inquiry" className="rounded-xl h-11" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-sm font-medium text-zinc-700">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Tell us more about what you need..."
                    className="min-h-[140px] rounded-xl resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <p className="text-xs text-zinc-400">We respect your privacy. No spam, ever.</p>
                  <Button className="rounded-full px-7 shadow-sm hover:shadow-md transition-all cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800">
                    Send message <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Common questions</h2>
              <p className="text-zinc-500 mb-8 text-sm">Quick answers to things we get asked often.</p>
              <div className="space-y-4">
                {FAQS.map((faq, i) => (
                  <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-900 mb-2">{faq.q}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP SECTION */}
      {/* <section className="py-16 bg-white border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Our Location</h2>
            <p className="text-zinc-500 text-sm">
              Find us in Dagupan City, Pangasinan, Philippines.
            </p>
          </div>
          <div className="w-full h-[450px] rounded-3xl overflow-hidden border border-zinc-200/85 shadow-sm relative group bg-zinc-50">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3835.434458311656!2d120.35826207606775!3d16.082358084594246!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3391690070819183%3A0xa97974ead9f524e!2sVertex%20Technologies%20Corporation!5e0!3m2!1sen!2sph!4v1720425300000!5m2!1sen!2sph"
              className="w-full h-full border-0 opacity-95 transition-all duration-300"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section> */}

      {/* CTA STRIP */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 rounded-3xl px-8 py-14 md:px-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl -ml-20 -mb-20" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Ready to find your next opportunity?</h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto text-lg">
                Explore thousands of jobs from top companies — no recruiter required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 rounded-full px-8 cursor-pointer">
                  <Link href="/signup">Create Free Account</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800 hover:text-white rounded-full px-8 cursor-pointer">
                  <Link href="/">Browse Jobs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

