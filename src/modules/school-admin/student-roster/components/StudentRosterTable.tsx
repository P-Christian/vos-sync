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
        <span className="font-mono text-muted-foreground text-xs">
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
          <span className="font-medium text-foreground">
            {student.last_name}, {student.first_name}
          </span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableHiding: false,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'course_name',
      header: 'Course',
      enableHiding: false,
      cell: ({ row }) => <span className="text-foreground/90">{row.original.course_name || '—'}</span>,
    },
    {
      accessorKey: 'school_year',
      header: 'School Year',
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.school_year}</span>,
    },
    {
      accessorKey: 'gpa',
      header: 'GPA',
      enableHiding: false,
      cell: ({ row }) => {
        const val = row.original.gpa;
        const num = val !== null && val !== undefined ? Number(val) : NaN;
        return (
          <span className="font-mono text-xs text-muted-foreground">
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Registered
            </span>
          );
        }
        if (status === 'Invited') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Invited
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
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
                <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
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
                  className="cursor-pointer text-xs font-medium text-destructive focus:text-destructive"
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
    <div className="bg-card border border-border text-card-foreground rounded-xl shadow-sm p-4">
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
