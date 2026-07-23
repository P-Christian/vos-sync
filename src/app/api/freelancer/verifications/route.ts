import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchUserVerifications } from "@/modules/freelancer/freelancer-profile/services/identity-verification.repo";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await getFreelancerProfile(token);
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const verifications = await fetchUserVerifications(profile.user_id);

        return NextResponse.json({ data: verifications });
    } catch (error) {
        console.error("GET /api/freelancer/verifications Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
