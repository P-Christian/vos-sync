import Link from "next/link"
import { Briefcase } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white dark:text-zinc-900" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">VOS Sync</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              Connecting top talent with the world&apos;s most innovative companies. Your next career move starts here.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Candidates</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/vos-sync/freelancer/jobs" className="hover:text-foreground transition-colors">Find Jobs</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Browse Companies</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Salary Guide</Link></li>
              <Link href="/career-advice" className="hover:text-foreground transition-colors">Career Advice</Link>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Employers</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Post a Job</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Browse Resumes</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Employer Resources</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li> <Link href="/about-us" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li> <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vos Sync. All rights reserved.
          </p>
          <div className="flex gap-4">
            {/* Social placeholders */}
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer">in</div>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer">tw</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
