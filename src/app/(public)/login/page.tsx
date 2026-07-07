"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Code2, CheckCircle2, Briefcase, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
  </svg>
)

function normalizeLoginErrorMessage(rawMsg: string, httpStatus?: number) {
    const msg = String(rawMsg || "")
    const m = msg.toLowerCase()

    // ✅ Invalid credentials (401)
    if (
        httpStatus === 401 ||
        m.includes("http 401") ||
        m.includes("unauthorized") ||
        m.includes("invalid credentials")
    ) {
        return "Credentials invalid."
    }

    // ✅ Backend unreachable / connection problems -> friendly message
    if (
        m.includes("cannot reach spring api") ||
        m.includes("econnrefused") ||
        m.includes("fetch failed") ||
        m.includes("network error") ||
        m.includes("timeout") ||
        m.includes("aborted")
    ) {
        return "Server is down, please contact Administrator."
    }

    return msg
}

type FieldErrors = {
    email?: string
    hashPassword?: string
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
            <LoginForm />
        </React.Suspense>
    )
}

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [showPw, setShowPw] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const [email, setEmail] = React.useState("")
    const [hashPassword, setHashPassword] = React.useState("")
    const [remember, setRemember] = React.useState(false)

    const [errors, setErrors] = React.useState<FieldErrors>({})

    const validate = React.useCallback((): boolean => {
        const next: FieldErrors = {}

        if (!String(email).trim()) next.email = "Email is required"
        if (!String(hashPassword).trim()) next.hashPassword = "Password is required"

        setErrors(next)
        return Object.keys(next).length === 0
    }, [email, hashPassword])

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setLoading(true)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, hashPassword, remember }),
            })

            const data = await res.json().catch(() => null)

            if (!res.ok || !data?.ok) {
                const raw = String(data?.message ?? `Login failed (HTTP ${res.status}).`)
                const msg = normalizeLoginErrorMessage(raw, res.status)
                toast.error("Sign in failed", { description: msg })
                return
            }

            toast.success("Signed in", { description: "Welcome back." })

            const next = searchParams.get("next") || "/main-dashboard"
            router.replace(next)
            router.refresh()
        } catch (err: unknown) {
            const errorInfo = err as { message?: string };
            const raw = errorInfo?.message ? String(errorInfo.message) : "Network error. Please try again."
            const msg = normalizeLoginErrorMessage(raw)
            toast.error("Sign in failed", { description: msg })
        } finally {
            setLoading(false)
        }
    }

    const emailHasError = Boolean(errors.email)
    const pwHasError = Boolean(errors.hashPassword)

    return (
        <main className="min-h-dvh flex-grow flex items-center justify-center py-8 px-4 md:px-6 bg-background text-foreground font-sans">
            <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 items-stretch min-h-[700px] bg-card rounded-xl shadow-sm border overflow-hidden">
                
                {/* Left Side: Content / How it Works */}
                <div className="hidden lg:flex flex-col justify-center p-10 lg:p-16 bg-muted/30 border-r relative overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/30 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10">
                        <div className="mb-10">
                            <span className="text-xl font-bold text-primary mb-2 block">Vos Sync</span>
                            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">How it Works</h1>
                            <div className="w-16 h-1.5 bg-primary rounded-full"></div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex gap-4 group">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-background border flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">Register</h3>
                                    <p className="text-base text-muted-foreground max-w-sm mt-1">
                                        Sign up through your social handles and register for challenges that excite you.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 group">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-background border flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                    <Code2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">Participate</h3>
                                    <p className="text-base text-muted-foreground max-w-sm mt-1">
                                        Once you&apos;re shortlisted you&apos;ll be able to see the problem statements and solve them.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 group">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-background border flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">Get Hired</h3>
                                    <p className="text-base text-muted-foreground max-w-sm mt-1">
                                        Top performers get to be shortlisted by companies for further rounds of interview.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Card */}
                <div className="flex flex-col justify-center items-center p-8 lg:p-16 bg-card">
                    <div className="w-full max-w-[440px]">
                        <div className="lg:hidden flex items-center gap-2 mb-8">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold text-foreground">Vos Sync</span>
                        </div>
                        
                        <div className="mb-8">
                            <h2 className="text-3xl font-semibold text-foreground">Sign In</h2>
                            <p className="text-sm text-muted-foreground mt-1">Welcome back! Please enter your details.</p>
                        </div>
                        
                        <form onSubmit={onSubmit} className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1.5" htmlFor="email">Email ID</label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="e.g. name@company.com" 
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                                    }}
                                    disabled={loading}
                                    className={cn("h-11", emailHasError && "border-destructive focus-visible:ring-destructive")}
                                />
                                {emailHasError ? (
                                    <p className="text-xs text-destructive mt-1.5">{errors.email}</p>
                                ) : null}
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-sm font-medium text-foreground block" htmlFor="password">Password</label>
                                    <Link className="text-sm text-primary hover:underline" href="#">Forgot password?</Link>
                                </div>
                                <div className="relative">
                                    <Input 
                                        id="password" 
                                        type={showPw ? "text" : "password"} 
                                        placeholder="Choose a password" 
                                        value={hashPassword}
                                        onChange={(e) => {
                                            setHashPassword(e.target.value)
                                            if (errors.hashPassword) setErrors((p) => ({ ...p, hashPassword: undefined }))
                                        }}
                                        disabled={loading}
                                        className={cn("h-11 pr-12", pwHasError && "border-destructive focus-visible:ring-destructive")}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPw(s => !s)}
                                        disabled={loading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {pwHasError ? (
                                    <p className="text-xs text-destructive mt-1.5">{errors.hashPassword}</p>
                                ) : null}
                            </div>
                            
                            <div className="flex items-center">
                                <Checkbox 
                                    id="remember" 
                                    checked={remember}
                                    onCheckedChange={(v) => setRemember(Boolean(v))}
                                    disabled={loading}
                                />
                                <label className="ml-2 text-sm text-muted-foreground cursor-pointer" htmlFor="remember">Remember me for 30 days</label>
                            </div>
                            
                            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                                {loading ? "Signing in..." : "Sign in"}
                            </Button>
                        </form>
                        
                        <div className="relative my-8 text-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t"></div>
                            </div>
                            <span className="relative px-4 bg-card text-sm text-muted-foreground">Or continue with</span>
                        </div>
                        
                        <Button variant="outline" type="button" className="w-full h-11 flex items-center justify-center gap-2 font-medium text-foreground">
                            <GoogleIcon />
                            Sign in with Google
                        </Button>
                        
                        <p className="mt-8 text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link className="text-primary font-medium hover:underline" href="/signup">Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}
