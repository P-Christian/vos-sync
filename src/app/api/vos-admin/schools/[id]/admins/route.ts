import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { getSchoolAdmins } from "@/modules/vos-admin/school-management/services/school.service";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        
        if (Number(payload.role_id) !== 3) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const resolvedParams = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
        const schoolId = parseInt(resolvedParams.id, 10);
        
        if (isNaN(schoolId)) {
            return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
        }

        const admins = await getSchoolAdmins(schoolId);

        return NextResponse.json(admins);
    } catch (error: unknown) {
        console.error("Failed to fetch school admins", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch school admins" }, 
            { status: 500 }
        );
    }
}
