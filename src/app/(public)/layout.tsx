// src/app/(public)/layout.tsx
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PublicMotionProvider } from "@/components/shared/MotionContainer"
import { PublicBackgroundWrapper } from "@/components/public/PublicBackgroundWrapper"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PublicMotionProvider>
            <div className="min-h-dvh  text-foreground relative">
                <PublicBackgroundWrapper />
                <div className="relative z-10 flex flex-col min-h-dvh">
                    <Header />
                    <main className="min-h-[calc(100dvh-6rem)] pt-24 flex-1">{children}</main>
                    <Footer />
                </div>
            </div>
        </PublicMotionProvider>
    )
}
