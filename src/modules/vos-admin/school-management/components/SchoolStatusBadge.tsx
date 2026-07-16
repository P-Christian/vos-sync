// src/modules/vos-admin/school-management/components/SchoolStatusBadge.tsx
import React from 'react';

interface Props {
  status: 'Active' | 'Inactive' | string;
}

export function SchoolStatusBadge({ status }: Props) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Inactive
    </span>
  );
}
