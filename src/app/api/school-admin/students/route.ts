import { NextRequest, NextResponse } from 'next/server';
import { getStudentRoster, addSingleStudent, addBulkStudents } from '@/modules/school-admin/student-roster/services';
import { resolveSchoolAdminContext, RosterHttpError } from '@/modules/school-admin/student-roster/services/roster-auth';

function toErrorStatus(error: unknown, fallback: number): { status: number; message: string } {
  if (error instanceof RosterHttpError) {
    return { status: error.status, message: error.message };
  }
  const msg = error instanceof Error ? error.message : 'Internal server error';
  return { status: fallback, message: msg };
}

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSchoolAdminContext(req);

    const { searchParams } = new URL(req.url);
    const school_year = searchParams.get('school_year') || undefined;
    const rawCourse = searchParams.get('school_course_id');
    const school_course_id = rawCourse && rawCourse !== 'all' ? rawCourse : undefined;
    const invitation_status = searchParams.get('invitation_status') || undefined;
    const search_query = searchParams.get('search_query') || undefined;
    const rawAlumni = searchParams.get('is_alumni');
    const is_alumni = rawAlumni === 'true' ? true : rawAlumni === 'false' ? false : undefined;

    const result = await getStudentRoster({
      school_id: session.schoolId,
      school_year,
      school_course_id,
      invitation_status,
      search_query,
      is_alumni,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const { status, message } = toErrorStatus(error, 500);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSchoolAdminContext(req);

    const body = await req.json();

    if (Array.isArray(body)) {
      const result = await addBulkStudents(session.schoolId, session.userId, body);
      return NextResponse.json({ success: true, count: result.length, data: result }, { status: 201 });
    } else {
      const result = await addSingleStudent(session.schoolId, session.userId, body);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }
  } catch (error: unknown) {
    const { status, message } = toErrorStatus(error, 400);
    return NextResponse.json({ error: message }, { status });
  }
}
