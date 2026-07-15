import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { createCourseRequestRepo } from "@/modules/school-admin/request-management/services/request.repo";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

async function getUserId(req: NextRequest): Promise<number | null> {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return 1;
    const cookieStore = await cookies();
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        return Number(payload.sub || payload.user_id || payload.id);
    } catch (e) {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const body = await req.json();
        
        const payload = {
            requested_by: userId,
            school_id: body.school_id,
            requested_course_name: body.requested_course_name,
            requested_course_code: body.requested_course_code || null,
            request_status: 'Pending'
        };

        const newRequest = await createCourseRequestRepo(payload);
        return NextResponse.json({ success: true, request: newRequest });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
