// src/app/api/school-admin/schools/[id]/courses/[courseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { updateCourse } from "@/modules/school-admin/school-management/services";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

async function verifyAdmin(req: NextRequest): Promise<number | null> {
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; courseId: string }> }) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const { courseId } = await params;
        const courseIdNum = Number(courseId);
        const body = await req.json();

        const updated = await updateCourse(courseIdNum, body, adminId);
        return NextResponse.json({ success: true, course: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
