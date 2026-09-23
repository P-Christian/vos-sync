import { NextRequest, NextResponse } from "next/server";
import { fetchSchoolsRepo } from "@/modules/vos-admin/school-verification/services/schoolVerification.repo";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || undefined;
        
        // Freelancers should only see verified schools.
        const schools = await fetchSchoolsRepo('VERIFIED', search);
        return NextResponse.json({ schools });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
