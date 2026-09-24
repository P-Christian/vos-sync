// src/app/(vos-sync)/vos-sync/school-admin/success-metrics/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { PortalPageHeader } from '@/components/shared/layout/PortalPageHeader';
import { getHeaderUserFromToken } from '@/modules/school-admin/services/token-helper';
import { SuccessMetricsPage } from '@/modules/school-admin/success-metrics/SuccessMetricsPage';
import { fetchSchoolByUserIdRepo } from '@/modules/school-admin/services/school-admin.repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Graduate Success & Placement Metrics | School Admin',
  description: 'View student employment success metrics, recruitment pipelines, and hiring trends.',
};

const JWT_SECRET = process.env.JWT_SECRET || 'default_super_secret_key_for_development';

export default async function Page() {
  const user = await getHeaderUserFromToken();
  const cookieStore = await cookies();
  const token = cookieStore.get('vos_access_token')?.value;

  let schoolId = 1;
  let schoolName = 'Institution';

  if (token) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      const userId = Number(payload.user_id || payload.sub || payload.id);
      if (userId) {
        const school = await fetchSchoolByUserIdRepo(userId);
        if (school) {
          schoolId = school.school_id;
          schoolName = school.school_name || 'Institution';
        }
      }
    } catch {
      // Fallback
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <PortalPageHeader user={user} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-secondary/10">
        <SuccessMetricsPage initialSchoolId={schoolId} initialSchoolName={schoolName} />
      </main>
    </div>
  );
}

