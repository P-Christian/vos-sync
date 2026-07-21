// src/modules/vos-admin/school-management/components/SchoolStatusBadge.tsx
import React from 'react';

interface Props {
  status: 'Draft' | 'Pending' | 'Active' | 'Inactive' | string;
}

export function SchoolStatusBadge({ status }: Props) {
  switch (status) {
    case 'Active':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Active
        </span>
      );
    case 'Pending':
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Pending
        </span>
      );
    case 'Draft':
      return (
        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20">
          Draft
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {status || 'Inactive'}
        </span>
      );
  }
}
