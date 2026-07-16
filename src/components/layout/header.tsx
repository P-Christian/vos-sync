"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeSelector } from "@/components/theme/ThemeSelector"

export function Header() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Handle navbar styling on scroll
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-background/90 backdrop-blur-md border-border shadow-sm py-3' : 'bg-transparent border-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">VOS Sync</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-muted-foreground">
          <Link href="/vos-sync/freelancer/jobs" className="hover:text-foreground transition-colors">Find Jobs</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Companies</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Salaries</Link>
          <Link href="/career-advice" className="hover:text-foreground transition-colors">Career Advice</Link>
          <Link href="/about-us" className="hover:text-foreground transition-colors">About Us</Link>
          <Link href="/contact-us" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ThemeSelector />
          <Button asChild variant="ghost" className="font-medium cursor-pointer text-foreground hover:bg-muted">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSelector />
          <button className="p-2 cursor-pointer text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border shadow-lg py-4 px-4 flex flex-col gap-4">
          <Link href="/vos-sync/freelancer/jobs" className="text-muted-foreground hover:text-foreground font-medium py-2">Find Jobs</Link>
          <Link href="/dashboard/companies" className="text-muted-foreground hover:text-foreground font-medium py-2">Companies</Link>
          <Link href="/dashboard/salaries" className="text-muted-foreground hover:text-foreground font-medium py-2">Salaries</Link>
          <Link href="/career-advice" className="text-muted-foreground hover:text-foreground font-medium py-2">Career Advice</Link>
          <Link href="/about-us" className="text-muted-foreground hover:text-foreground font-medium py-2">About Us</Link>
          <Link href="/contact-us" className="text-muted-foreground hover:text-foreground font-medium py-2">Contact</Link>
          <hr className="border-border" />
          <Button asChild variant="outline" className="w-full justify-center cursor-pointer border-border text-foreground hover:bg-muted">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="w-full justify-center cursor-pointer bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      )}
    </header>
  )
}
