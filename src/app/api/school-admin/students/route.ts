import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { getStudentRoster, addSingleStudent, addBulkStudents } from '@/modules/school-admin/student-roster/services';
import { fetchSchoolByUserIdRepo } from '@/modules/school-admin/services/school-admin.repo';

const COOKIE_NAME = 'vos_access_token';
const JWT_SECRET = process.env.JWT_SECRET || 'default_super_secret_key_for_development';

async function getAuthSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = Number(payload.user_id || payload.sub);
    if (!userId) return null;

    const school = await fetchSchoolByUserIdRepo(userId);
    if (!school) return null;

    return { userId, schoolId: school.school_id };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const school_year = searchParams.get('school_year') || undefined;
    const school_course_id = searchParams.get('school_course_id') || undefined;
    const invitation_status = searchParams.get('invitation_status') || undefined;
    const search_query = searchParams.get('search_query') || undefined;

    const result = await getStudentRoster({
      school_id: session.schoolId,
      school_year,
      school_course_id,
      invitation_status,
      search_query,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (Array.isArray(body)) {
      const result = await addBulkStudents(session.schoolId, session.userId, body);
      return NextResponse.json({ success: true, count: result.length, data: result }, { status: 201 });
    } else {
      const result = await addSingleStudent(session.schoolId, session.userId, body);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add student(s)' }, { status: 400 });
  }
}
