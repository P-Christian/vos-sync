// src/app/api/vos-admin/schools/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { getSchoolDetail, updateSchool } from "@/modules/vos-admin/school-management/services";
import { updateSchoolSchema } from "@/modules/vos-admin/school-management/types/school.schema";

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
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) {
            console.error("verifyAdmin failed. Unauthorized.");
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { id } = await params;
        const schoolId = Number(id);
        console.log("GET /api/vos-admin/schools/[id] called with id:", id, "parsed schoolId:", schoolId);
        
        const school = await getSchoolDetail(schoolId);
        if (!school) {
            console.error("School not found for id:", schoolId);
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        return NextResponse.json({ school });
    } catch (err: unknown) {
        console.error("Error in GET /api/vos-admin/schools/[id]:", err);
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

        const { id } = await params;
        const schoolId = Number(id);
        const body = await req.json();

        // Zod validation
        const parsed = updateSchoolSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues.map(e => e.message).join(", ") }, { status: 400 });
        }

        const updated = await updateSchool(schoolId, parsed.data, adminId);
        return NextResponse.json({ success: true, school: updated });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
