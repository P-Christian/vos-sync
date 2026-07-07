"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"

export function Header() {
    const pathname = usePathname()
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
        <header className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-white/90 backdrop-blur-md border-zinc-200 shadow-sm py-3' : 'bg-transparent border-transparent py-5'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-950">Vos Sync</span>
            </Link>
  
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-zinc-600">
              <Link href="#" className="hover:text-zinc-900 transition-colors">Find Jobs</Link>
              <Link href="#" className="hover:text-zinc-900 transition-colors">Companies</Link>
              <Link href="#" className="hover:text-zinc-900 transition-colors">Salaries</Link>
              <Link href="#" className="hover:text-zinc-900 transition-colors">Career Advice</Link>
            </nav>
  
            <div className="hidden md:flex items-center gap-4">
              <Button asChild variant="ghost" className="font-medium cursor-pointer text-zinc-900 hover:bg-zinc-100">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
  
            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 cursor-pointer text-zinc-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
  
          {/* Mobile Nav Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-zinc-200 shadow-lg py-4 px-4 flex flex-col gap-4">
              <Link href="#" className="text-zinc-600 font-medium py-2">Find Jobs</Link>
              <Link href="#" className="text-zinc-600 font-medium py-2">Companies</Link>
              <Link href="#" className="text-zinc-600 font-medium py-2">Salaries</Link>
              <hr className="border-zinc-100" />
              <Button asChild variant="outline" className="w-full justify-center cursor-pointer border-zinc-200 text-zinc-900">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="w-full justify-center cursor-pointer bg-zinc-900 text-zinc-50">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </header>
    )
}
