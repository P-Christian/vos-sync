// src/modules/school-admin/request-management/components/RequestStatusBadge.tsx
import React from 'react';
import { RequestStatus } from '../types/request.types';

interface Props {
  status: RequestStatus;
}

export function RequestStatusBadge({ status }: Props) {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        Approved
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
      Pending
    </span>
  );
}
