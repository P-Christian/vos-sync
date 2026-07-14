import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as jose from "jose";
import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavUser } from "@/app/(vos-sync)/vos-sync/_components/nav-user";

async function verifyAdminRole() {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
        return { isAdmin: true, user: { name: "Local Admin", email: "admin@localhost", avatar: "" } };
    }
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    if (!token) return { isAdmin: false, user: null };
    
    try {
        const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        
        return { 
            isAdmin: true, 
            user: {
                name: payload.user_fname && payload.user_lname ? `${payload.user_fname} ${payload.user_lname}` : "Admin User",
                email: (payload.user_email as string) || "admin@example.com",
                avatar: (payload.user_image as string) || ""
            } 
        }; 
    } catch (error) {
        return { isAdmin: false, user: null };
    }
}

export default async function SchoolAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAdmin, user } = await verifyAdminRole();
    
    if (!isAdmin) {
        // Redirect unauthorized users to the main dashboard or login
        redirect("/main-dashboard");
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-end border-b shadow-sm bg-background sm:h-16 overflow-hidden px-4 gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    <Bell className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <div className="border-l h-6 mx-2 hidden sm:block" />
                <div className="w-auto max-w-[240px]">
                    {user && <NavUser user={user} />}
                </div>
            </header>

            {children}
        </div>
    );
}
