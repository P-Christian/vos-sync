import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { calculateIdProofScore } from "@/modules/freelancer/freelancer-profile/services/identity-verification.service";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scoreResult = await calculateIdProofScore(token);

        if (!scoreResult) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json(scoreResult);
    } catch (error) {
        console.error("GET /api/freelancer/id-proof-score Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
