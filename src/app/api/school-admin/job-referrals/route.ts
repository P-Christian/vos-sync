// src/app/api/school-admin/job-referrals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { fetchSchoolByUserIdRepo } from '@/modules/school-admin/services/school-admin.repo';
import {
  getActiveJobsService,
  getEligibleStudentCandidatesService,
  createBatchReferralsService,
  getAdminReferralsService,
} from '@/modules/school-admin/job-referrals/services';
import { createReferralsSchema } from '@/modules/school-admin/job-referrals/types/job-referrals.schema';

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

    return {
      userId,
      schoolId: school.school_id,
      schoolName: school.school_name || 'Partner School',
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. School Admin access required.' }, { status: 401 });
    }

    const origin = req.nextUrl.origin;

    const [jobs, students, referrals] = await Promise.all([
      getActiveJobsService().catch((err) => {
        console.error('Error fetching jobs:', err);
        return [];
      }),
      getEligibleStudentCandidatesService(session.schoolId).catch((err) => {
        console.error('Error fetching student candidates:', err);
        return [];
      }),
      getAdminReferralsService(session.userId, origin).catch((err) => {
        console.error('Error fetching admin referrals:', err);
        return [];
      }),
    ]);

    return NextResponse.json({
      school: {
        school_id: session.schoolId,
        school_name: session.schoolName,
      },
      jobs,
      students,
      referrals,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. School Admin access required.' }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = createReferralsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;
    const results = await createBatchReferralsService(session.userId, session.schoolId, origin, parsed.data);

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create job referrals';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
