import { Clock, ArrowLeft, Mail, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "eligibility", title: "2. Account Eligibility" },
  { id: "conduct", title: "3. User Conduct Rules" },
  { id: "intellectual", title: "4. Intellectual Property" },
  { id: "termination", title: "5. Termination of Service" },
  { id: "limitation", title: "6. Limitation of Liability" },
  { id: "governing", title: "7. Governing Law" },
  { id: "contact", title: "8. Contact Us" },
];

export default function TermsOfService() {
  return (
    <div className="bg-white text-zinc-950 font-sans pt-16">
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-24 md:pb-20 border-b border-zinc-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Button asChild variant="ghost" size="sm" className="mb-6 rounded-full -ml-3 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer">
              <Link href="/" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Link>
            </Button>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="py-1 px-3 rounded-full bg-zinc-100 text-zinc-800 text-xs font-medium">
                Terms
              </Badge>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Last updated: July 8, 2026
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-6 leading-tight">
              Terms of Service
            </h1>
            <p className="text-lg text-zinc-500 leading-relaxed">
              Welcome to Vos Sync. These terms govern your access to and use of our platform, services, websites, and applications. Please read them carefully.
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT & SIDEBAR INDEX */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Sidebar Table of Contents */}
            <div className="lg:col-span-1 lg:sticky lg:top-28 h-fit space-y-2 hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 px-3">On this page</p>
              <nav className="flex flex-col gap-1">
                {SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-3 py-2 rounded-xl transition-all duration-150"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Document body */}
            <div className="lg:col-span-3 prose prose-zinc max-w-none text-zinc-600 space-y-10 leading-relaxed">
              <div id="acceptance" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">1. Acceptance of Terms</h2>
                <p>
                  By creating an account, browsing listings, or using any services on Vos Sync, you agree to comply with and be bound by these Terms of Service, along with our Privacy Policy. If you do not agree to these terms, you must immediately cease using the platform.
                </p>
              </div>

              <div id="eligibility" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">2. Account Eligibility</h2>
                <p>
                  To register an account or use Vos Sync, you represent and warrant that:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>You are at least 18 years of age or the legal age of majority in your jurisdiction.</li>
                  <li>You have the legal capacity and authority to enter into binding agreements.</li>
                  <li>The registry details you submit are accurate, complete, and current.</li>
                  <li>Your use of the service will not violate any applicable local, national, or international labor regulations.</li>
                </ul>
              </div>

              <div id="conduct" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">3. User Conduct Rules</h2>
                <p>
                  You agree to use Vos Sync only for lawful recruitment and job search purposes. You are prohibited from:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Posting misleading, fraudulent, or outdated job opportunities.</li>
                  <li>Impersonating another person, brand, recruiter, or business entity.</li>
                  <li>Scraping candidate CVs, email contacts, or database items using automated bots or scrapers without consent.</li>
                  <li>Uploading files containing malware, viruses, or code designed to interfere with system operations.</li>
                </ul>
              </div>

              <div id="intellectual" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">4. Intellectual Property</h2>
                <p>
                  All content, branding elements, software, database matching mechanisms, site designs, and interactive layouts on Vos Sync are the exclusive property of Vos Sync and its licensors. 
                </p>
                <p>
                  You retain ownership of the data, resumes, and text descriptions you post to the service. However, by uploading materials, you grant Vos Sync a worldwide, royalty-free, non-exclusive license to host and show your profile data to matching employers or candidates.
                </p>
              </div>

              <div id="termination" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">5. Termination of Service</h2>
                <p>
                  We reserve the right to suspend or terminate your access to the platform immediately, without prior notification or liability, for reasons including:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Breach of these Terms of Service.</li>
                  <li>Unverified corporate registration details or suspected spam activities.</li>
                  <li>Actions that cause legal liability or security risks to other users or our infrastructure.</li>
                </ul>
              </div>

              <div id="limitation" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">6. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, Vos Sync provides the service &quot;as is&quot; and &quot;as available.&quot; We make no warranties regarding:
                </p>
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-2 text-sm text-zinc-500 my-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <p>The accuracy or completeness of candidate resumes or recruiter listings.</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <p>Whether relationships made on the platform result in employment contract fulfillment.</p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <p>System downtime, server errors, or lost data inputs due to outages.</p>
                  </div>
                </div>
              </div>

              <div id="governing" className="scroll-mt-28 space-y-3">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">7. Governing Law</h2>
                <p>
                  These Terms of Service and any dispute arising out of or related to your use of the platform shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without giving effect to conflict of laws principles.
                </p>
              </div>

              <div id="contact" className="scroll-mt-28 space-y-4">
                <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-2">8. Contact Us</h2>
                <p>
                  If you have queries, interpretations, or feedback concerning these Terms, please reach out:
                </p>
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-900">support@vossync.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-zinc-500" />
                    <span className="text-sm text-zinc-500">Legal Agreements Team, Vos Sync, Manila, Philippines</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
