import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import bcrypt from "bcrypt";
import { assignSchoolAdminJunction } from "@/modules/vos-admin/school-management/services/school.service";
import { createUser } from "@/modules/auth/services/auth.repo";
import { CreateSchoolAdminPayload } from "@/modules/vos-admin/school-management/types/school.types";

export async function POST(req: NextRequest) {
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

        const adminId = Number(payload.sub || payload.user_id || payload.id);
        const body: CreateSchoolAdminPayload = await req.json();

        if (!body.school_id || !body.user_email || !body.user_fname || !body.user_lname || !body.user_contact) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const passwordToHash = body.password || "password123";
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);

        // 1. Create the user in vs_user
        const newUserPayload = {
            user_email: body.user_email,
            user_contact: body.user_contact,
            hash_password: hashedPassword,
            user_fname: body.user_fname,
            user_lname: body.user_lname,
            role: "SCH_ADMIN",
            role_id: 4,
            user_status: "Active"
        };
        const newUser = await createUser(newUserPayload);

        // 2. Link them in vs_school_admin
        const junction = await assignSchoolAdminJunction(
            body.school_id,
            newUser.user_id,
            adminId
        );

        return NextResponse.json({ 
            success: true, 
            message: "School Admin created and assigned successfully",
            data: junction
        });

    } catch (error: unknown) {
        console.error("Failed to create and assign school admin", error);
        const message = error instanceof Error ? error.message : "Failed to create school admin";
        return NextResponse.json(
            { error: message }, 
            { status: 500 }
        );
    }
}
