// src/app/api/school-admin/schools/[id]/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { getSchoolCourses, createCourse, updateCourse } from "@/modules/school-admin/school-management/services";
import { createSchoolCourseSchema } from "@/modules/school-admin/school-management/types/school.schema";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const { id } = await params;
        const schoolId = Number(id);
        const courses = await getSchoolCourses(schoolId);

        return NextResponse.json({ courses });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const { id } = await params;
        const schoolId = Number(id);
        const body = await req.json();

        // Zod validation
        const parsed = createSchoolCourseSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors.map(e => e.message).join(", ") }, { status: 400 });
        }

        const newCourse = await createCourse(schoolId, parsed.data, adminId);
        return NextResponse.json({ success: true, course: newCourse });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
