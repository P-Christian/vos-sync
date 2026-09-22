import React from 'react';
import { PortalPageHeader } from '@/components/shared/layout/PortalPageHeader';
import { getHeaderUserFromToken } from '@/modules/school-admin/services/token-helper';
import { JobReferralsPage } from '@/modules/school-admin/job-referrals/JobReferralsPage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Student Job Referrals | School Admin',
  description: 'Refer verified student freelancers to active partner job postings and generate AI recommendation letters.',
};

export default async function Page() {
  const user = await getHeaderUserFromToken();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <PortalPageHeader user={user} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-secondary/10">
        <JobReferralsPage />
      </main>
    </div>
  );
}
