// src/modules/vos-admin/user-management/components/UserStatusBadge.tsx
import React from 'react';

interface Props {
  status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
}

export function UserStatusBadge({ status }: Props) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
        Rejected
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
        Pending Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-55 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
      Not Submitted
    </span>
  );
}
