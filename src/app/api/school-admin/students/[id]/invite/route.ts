import { NextResponse, type NextRequest } from 'next/server';
import { inviteStudentService } from '@/modules/school-admin/student-roster/services';
import {
  RosterHttpError,
  resolveSchoolAdminContext,
} from '@/modules/school-admin/student-roster/services/roster-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { schoolId } = await resolveSchoolAdminContext(req);

    const { id } = await params;
    const studentId = Number(id);

    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      throw new RosterHttpError(400, 'Invalid student ID');
    }

    const origin = req.nextUrl.origin;
    const result = await inviteStudentService(schoolId, studentId, origin);

    return NextResponse.json({
      success: true,
      token: result.token,
      invitation_url: result.invitation_url,
      expires_at: result.expires_at,
      student: result.student,
    });
  } catch (error: unknown) {
    if (error instanceof RosterHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Student invitation service is temporarily unavailable' },
      { status: 503 },
    );
  }
}
