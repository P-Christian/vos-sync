import { NextRequest, NextResponse } from 'next/server';
import { removeStudentFromRoster, updateStudentAcademics } from '@/modules/school-admin/student-roster/services';
import { resolveSchoolAdminContext, RosterHttpError } from '@/modules/school-admin/student-roster/services/roster-auth';

function toErrorStatus(error: unknown, fallback: number): { status: number; message: string } {
  if (error instanceof RosterHttpError) {
    return { status: error.status, message: error.message };
  }
  const msg = error instanceof Error ? error.message : 'Request failed';
  return { status: fallback, message: msg };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await resolveSchoolAdminContext(req);

    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    const studentId = Number(id);
    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const body = await req.json();
    const updated = await updateStudentAcademics(session.schoolId, studentId, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const { status, message } = toErrorStatus(error, 400);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await resolveSchoolAdminContext(req);

    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    const studentId = Number(id);
    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    await removeStudentFromRoster(session.schoolId, studentId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { status, message } = toErrorStatus(error, 400);
    return NextResponse.json({ error: message }, { status });
  }
}
