// src/app/api/school-admin/schools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { getSchoolList, createSchool } from "@/modules/school-admin/school-management/services";
import { createSchoolSchema } from "@/modules/school-admin/school-management/types/school.schema";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

async function verifyAdmin(req: NextRequest): Promise<number | null> {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return 1; // mock admin id
    const cookieStore = await cookies();
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        // Assuming admin id is in sub or user_id
        return Number(payload.sub || payload.user_id || payload.id);
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || undefined;
        const search = searchParams.get("search") || undefined;

        const schools = await getSchoolList(status, search);
        return NextResponse.json({ schools });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const body = await req.json();
        
        // Zod validation
        const parsed = createSchoolSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues.map(e => e.message).join(", ") }, { status: 400 });
        }

        const newSchool = await createSchool(parsed.data, adminId);
        return NextResponse.json({ success: true, school: newSchool });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
