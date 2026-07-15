import { NextRequest, NextResponse } from "next/server";
import { fetchSchoolsRepo } from "@/modules/school-admin/school-management/services/school.repo";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || undefined;
        
        // Freelancers should only ever see Active schools
        const schools = await fetchSchoolsRepo('Active', search);
        return NextResponse.json({ schools });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
