// src/app/api/school-admin/success-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSchoolSuccessMetrics } from '@/modules/school-admin/success-metrics/services/success-metrics.service';
import { SuccessMetricsFilterSchema } from '@/modules/school-admin/success-metrics/types/success-metrics.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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
