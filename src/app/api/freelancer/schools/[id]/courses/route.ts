import { NextRequest, NextResponse } from "next/server";
import { fetchCoursesBySchoolRepo } from "@/modules/vos-admin/school-management/services/school.repo";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: paramId } = await params;
        const schoolId = parseInt(paramId, 10);
        
        if (isNaN(schoolId)) {
            return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
        }
        
        // Fetch courses for the given school
        const courses = await fetchCoursesBySchoolRepo(schoolId);
        
        // Freelancers should only ever see Active courses
        const activeCourses = courses.filter(c => c.course_status === 'Active');
        
        return NextResponse.json({ courses: activeCourses });
    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message || "Internal Server Error" }, { status: 500 });
    }
}
