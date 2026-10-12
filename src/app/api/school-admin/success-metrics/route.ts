// src/app/api/school-admin/success-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSchoolSuccessMetrics } from '@/modules/school-admin/success-metrics/services/success-metrics.service';
import { SuccessMetricsFilterSchema } from '@/modules/school-admin/success-metrics/types/success-metrics.schema';
import { authenticateRequest, hasRole } from '@/lib/authenticated-session';
import { fetchSchoolByUserIdRepo } from '@/modules/school-admin/services/school-admin.repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const isSchoolAdmin = session ? hasRole(session, [3, 4], ["ADMIN", "ADMINISTRATOR", "SCHOOL_ADMIN", "SCH_ADMIN"]) : false;
    if (session && !isSchoolAdmin && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Forbidden: school admin role required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const schoolId = searchParams.get('school_id');
    const schoolYear = searchParams.get('school_year') || undefined;
    const schoolCourseId = searchParams.get('school_course_id') || undefined;
    const isAlumni = searchParams.get('is_alumni') || undefined;

    const parseResult = SuccessMetricsFilterSchema.safeParse({
      school_id: schoolId,
      school_year: schoolYear,
      school_course_id: schoolCourseId,
      is_alumni: isAlumni,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Invalid filter parameters provided.',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // If caller is school admin (not platform super admin), ensure they can only query their own school
    if (session && session.roleId === 4 && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      const schoolAdminData = await fetchSchoolByUserIdRepo(Number(session.userId));
      if (!schoolAdminData || String(schoolAdminData.school_id) !== String(parseResult.data.school_id)) {
        return NextResponse.json({ error: "Forbidden: unauthorized school access." }, { status: 403 });
      }
    }

    const metricsData = await getSchoolSuccessMetrics(parseResult.data);

    return NextResponse.json({
      success: true,
      data: metricsData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error calculating metrics';
    console.error('[API /api/school-admin/success-metrics] Error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_FAIL',
        message,
      },
      { status: 500 }
    );
  }
}
