import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { removeStudentFromRoster } from '@/modules/school-admin/student-roster/services';
import { updateStudentRepo } from '@/modules/school-admin/student-roster/services/student-roster.repo';

const COOKIE_NAME = 'vos_access_token';
const JWT_SECRET = process.env.JWT_SECRET || 'default_super_secret_key_for_development';

async function verifyAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return Number(payload.user_id || payload.sub) || null;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const studentId = parseInt(id, 10);
    if (isNaN(studentId)) return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });

    const body = await req.json();
    const updated = await updateStudentRepo(studentId, { ...body, updated_by: userId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update student' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const studentId = parseInt(id, 10);
    if (isNaN(studentId)) return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });

    await removeStudentFromRoster(studentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete student' }, { status: 400 });
  }
}
