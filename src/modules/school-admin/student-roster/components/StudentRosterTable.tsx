'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreVertical } from 'lucide-react';
import { RosterDataTable } from './RosterDataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { VsSchoolStudent } from '../types/student-roster.types';

interface StudentRosterTableProps {
  students: VsSchoolStudent[];
  isLoading: boolean;
  onEdit: (student: VsSchoolStudent) => void;
  onDelete: (studentId: number) => Promise<void>;
}

export const StudentRosterTable: React.FC<StudentRosterTableProps> = ({
  students,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const columns: ColumnDef<VsSchoolStudent>[] = [
    {
      accessorKey: 'student_number',
      header: 'Student #',
      enableHiding: false,
      cell: ({ row }) => (
        <span className="font-mono text-slate-600 text-xs">
          {row.original.student_number || '—'}
        </span>
      ),
    },
    {
      id: 'student_name',
      header: 'Student Name',
      enableHiding: false,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <span className="font-medium text-slate-900">
            {student.last_name}, {student.first_name}
          </span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableHiding: false,
      cell: ({ row }) => <span className="text-slate-600">{row.original.email}</span>,
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      enableHiding: false,
      cell: ({ row }) => <span className="text-slate-700">{row.original.course_name || '—'}</span>,
    },
    {
      accessorKey: 'school_year',
      header: 'School Year',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-xs text-slate-600">{row.original.school_year}</span>,
    },
    {
      accessorKey: 'gpa',
      header: 'GPA',
      enableHiding: false,
      cell: ({ row }) => {
        const val = row.original.gpa;
        const num = val !== null && val !== undefined ? Number(val) : NaN;
        return (
          <span className="font-mono text-xs text-slate-600">
            {!isNaN(num) ? num.toFixed(2) : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'invitation_status',
      header: 'Referral Status',
      enableHiding: false,
      cell: ({ row }) => {
        const status = row.original.invitation_status;
        if (status === 'Registered') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Registered
            </span>
          );
        }
        if (status === 'Invited') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Invited
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Not Sent
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => onEdit(student)}
                  className="cursor-pointer text-xs font-medium"
                >
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Remove ${student.first_name} ${student.last_name} from roster?`)) {
                      onDelete(student.student_id);
                    }
                  }}
                  className="cursor-pointer text-xs font-medium text-red-600 focus:text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <RosterDataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        emptyTitle="No students found"
        emptyDescription="No student roster records match your criteria. Add students manually or import via CSV."
      />
    </div>
  );
};
