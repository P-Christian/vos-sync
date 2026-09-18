// src/app/(public)/layout.tsx
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PublicMotionProvider } from "@/components/shared/MotionContainer"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PublicMotionProvider>
            <div className="min-h-dvh bg-background text-foreground">
                <Header />
                <main className="min-h-[calc(100dvh-6rem)] pt-24">{children}</main>
                <Footer />
            </div>
        </PublicMotionProvider>
    )
}
