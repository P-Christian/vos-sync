"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, Briefcase, ChevronDown, LayoutDashboard, FileText, LogOut } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { ThemeSelector } from "@/components/theme/ThemeSelector"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AuthUser = {
  name: string
  email?: string
  avatar?: string
  role: "client" | "freelancer" | "other"
}

const PUBLIC_MOBILE_MENU_ID = "public-mobile-navigation"

export function Header() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [mobileMenuPath, setMobileMenuPath] = React.useState<string | null>(null)
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [checkingAuth, setCheckingAuth] = React.useState(true)
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null)
  const mobileMenuOpen = mobileMenuPath === pathname

  // Handle navbar styling on scroll
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  React.useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuPath(null)
        mobileMenuButtonRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  // Check logged-in user session
  React.useEffect(() => {
    async function checkAuth() {
      try {
        // 1. Try Client profile first
        const clientRes = await fetch("/api/client/company-profile", { cache: "no-store" })
        if (clientRes.ok) {
          const clientJson = await clientRes.json()
          if (clientJson.company) {
            const comp = clientJson.company
            const logo = comp.company_logo
              ? comp.company_logo.startsWith("http") || comp.company_logo.startsWith("/")
                ? comp.company_logo
                : `/api/client/assets/${comp.company_logo}`
              : ""
            setUser({
              name: comp.company_name || "Client Portal",
              email: comp.company_email || "",
              avatar: logo,
              role: "client",
            })
            setCheckingAuth(false)
            return
          }
        }

        // 2. Fetch User / Freelancer profile from vs_user endpoint
        const freeRes = await fetch("/api/freelancer/profile", { cache: "no-store" })
        if (freeRes.ok) {
          const freeJson = await freeRes.json()
          if (freeJson.ok && freeJson.data) {
            const f = freeJson.data
            const name = `${f.user_fname || f.first_name || ""} ${f.user_lname || f.last_name || ""}`.trim() || "User"
            const rawAvatar = f.profile_image_url || f.profile_picture || ""
            const avatar = rawAvatar
              ? rawAvatar.startsWith("http") || rawAvatar.startsWith("/")
                ? rawAvatar
                : `/api/client/assets/${rawAvatar}`
              : ""
            const isClientRole = f.role_id === 2 || String(f.role || "").toUpperCase() === "CLIENT"
            setUser({
              name,
              email: f.user_email || f.email || "",
              avatar,
              role: isClientRole ? "client" : "freelancer",
            })
            setCheckingAuth(false)
            return
          }
        }
      } catch {
        // Ignore fetch errors for unauthenticated guests
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      document.cookie = "vos_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;"
      window.location.href = "/login"
    }
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : "U"

  return (
    <motion.header
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 motion-reduce:transition-none border-b ${isScrolled ? 'bg-background/90 backdrop-blur-md border-border shadow-sm py-3' : 'bg-transparent border-transparent py-5'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className="flex min-h-11 items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-background" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">VOS Sync</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8 font-medium text-sm text-muted-foreground">
          <Link href="/find-jobs" className="flex min-h-11 items-center hover:text-foreground transition-colors">Find Jobs</Link>
          <Link href="/how-it-works" className="flex min-h-11 items-center hover:text-foreground transition-colors">How It Works</Link>
          <Link href="/companies" className="flex min-h-11 items-center hover:text-foreground transition-colors">Companies</Link>
          <Link href="/career-advice" className="flex min-h-11 items-center hover:text-foreground transition-colors">Career Advice</Link>
          <Link href="/about-us" className="flex min-h-11 items-center hover:text-foreground transition-colors">About Us</Link>
          <Link href="/contact-us" className="flex min-h-11 items-center hover:text-foreground transition-colors">Contact</Link>
        </nav>
 
        <div className="hidden lg:flex items-center gap-4">
          <ThemeSelector />

          {!checkingAuth && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex min-h-11 items-center gap-2.5 px-3 py-2 rounded-full hover:bg-muted cursor-pointer transition-all">
                  <div className="h-7 w-7 rounded-full border border-border/40 overflow-hidden relative shrink-0 bg-muted flex items-center justify-center font-bold text-xs">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">{initials}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground max-w-[140px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl rounded-xl border border-border bg-popover">
                <div className="px-3 py-2 border-b border-border/50 mb-1">
                  <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                  {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                </div>

                {user.role === "client" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/vos-sync/client/dashboard" className="flex min-h-11 items-center gap-2.5 cursor-pointer rounded-lg py-2 font-medium">
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/vos-sync/client/jobs" className="flex min-h-11 items-center gap-2.5 cursor-pointer rounded-lg py-2 font-medium">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        Manage Jobs
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/vos-sync/freelancer/dashboard" className="flex min-h-11 items-center gap-2.5 cursor-pointer rounded-lg py-2 font-medium">
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/vos-sync/freelancer/applications" className="flex min-h-11 items-center gap-2.5 cursor-pointer rounded-lg py-2 font-medium">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        My Applications
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex min-h-11 items-center gap-2.5 cursor-pointer rounded-lg py-2 text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" className="min-h-11 font-medium cursor-pointer text-foreground hover:bg-muted">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="min-h-11 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
 
        {/* Mobile Menu Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <ThemeSelector />
          <Button
            ref={mobileMenuButtonRef}
            type="button"
            variant="ghost"
            className="size-11 p-0 cursor-pointer text-foreground"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls={PUBLIC_MOBILE_MENU_ID}
            onClick={() => setMobileMenuPath(mobileMenuOpen ? null : pathname)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>
 
      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <nav
          id={PUBLIC_MOBILE_MENU_ID}
          aria-label="Mobile navigation"
          onClick={() => setMobileMenuPath(null)}
          className="lg:hidden absolute top-full left-0 flex max-h-[calc(100dvh-6rem)] w-full flex-col gap-4 overflow-y-auto overscroll-contain border-b border-border bg-background px-4 py-4 shadow-lg"
        >
          <Link href="/find-jobs" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground font-medium">Find Jobs</Link>
          <Link href="/how-it-works" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground font-medium">How It Works</Link>
          <Link href="/companies" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground font-medium">Companies</Link>
          <Link href="/career-advice" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground font-medium">Career Advice</Link>
          <Link href="/about-us" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground font-medium">About Us</Link>
          <Link href="/contact-us" className="flex min-h-11 items-center text-muted-foreground hover:text-foreground font-medium">Contact</Link>
          <hr className="border-border" />
          {user ? (
            <>
              <div className="flex items-center gap-3 px-2 py-1">
                <div className="h-9 w-9 rounded-full border border-border/40 overflow-hidden relative shrink-0 bg-muted flex items-center justify-center font-bold text-xs">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user.name}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                </div>
              </div>
              {user.role === "client" ? (
                <>
                  <Button asChild variant="outline" className="min-h-11 w-full justify-start gap-2 cursor-pointer border-border text-foreground hover:bg-muted">
                    <Link href="/vos-sync/client/dashboard">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-11 w-full justify-start gap-2 cursor-pointer border-border text-foreground hover:bg-muted">
                    <Link href="/vos-sync/client/jobs">
                      <Briefcase className="w-4 h-4" /> Manage Jobs
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="min-h-11 w-full justify-start gap-2 cursor-pointer border-border text-foreground hover:bg-muted">
                    <Link href="/vos-sync/freelancer/dashboard">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-11 w-full justify-start gap-2 cursor-pointer border-border text-foreground hover:bg-muted">
                    <Link href="/vos-sync/freelancer/applications">
                      <FileText className="w-4 h-4" /> My Applications
                    </Link>
                  </Button>
                </>
              )}
              <Button onClick={handleLogout} variant="destructive" className="min-h-11 w-full justify-start gap-2 cursor-pointer">
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" className="min-h-11 w-full justify-center cursor-pointer border-border text-foreground hover:bg-muted">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="min-h-11 w-full justify-center cursor-pointer bg-primary text-primary-foreground">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      )}
    </motion.header>
  )
}

