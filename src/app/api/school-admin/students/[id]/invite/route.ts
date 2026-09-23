// src/app/api/school-admin/students/[id]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { fetchSchoolByUserIdRepo } from '@/modules/school-admin/services/school-admin.repo';
import { inviteStudentService } from '@/modules/school-admin/student-roster/services';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'vos_access_token';
const JWT_SECRET = process.env.JWT_SECRET || 'default_super_secret_key_for_development';

async function getAuthSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = Number(payload.user_id || payload.sub);
    if (!userId) return null;

    const school = await fetchSchoolByUserIdRepo(userId);
    if (!school) return null;

    return { userId, schoolId: school.school_id, schoolName: school.school_name };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const studentId = Number(id);

    if (!studentId || isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const result = await inviteStudentService(session.schoolId, studentId, origin);

    return NextResponse.json({
      success: true,
      token: result.token,
      invitation_url: result.invitation_url,
      expires_at: result.expires_at,
      student: result.student,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to issue student invitation';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
