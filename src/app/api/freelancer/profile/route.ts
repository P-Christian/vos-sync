// src/app/api/freelancer/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFreelancerProfile } from "@/modules/freelancer/freelancer-profile/services/freelancer-profile.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json(
                { ok: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const profile = await getFreelancerProfile(token);

        if (!profile) {
            return NextResponse.json(
                { ok: false, message: "Profile not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { ok: true, data: profile },
            { status: 200 }
        );

    } catch (err: any) {
        console.error("[api/freelancer/profile] Error:", err);
        return NextResponse.json(
            { ok: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
