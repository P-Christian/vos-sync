"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { VsSchoolCourse, SchoolStatus } from "@/modules/school-admin/types/school-admin.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Edit, Power, Trash2, BookOpen } from "lucide-react";
import { useSchoolCourses } from "./hooks/useSchoolCourses";
import { CoursesDataTable } from "./components/CoursesDataTable";
import { AddCourseModal } from "./components/AddCourseModal";
import { EditCourseModal } from "./components/EditCourseModal";
import { formatCourseCode, getCourseStatusBadgeVariant, filterCourses } from "./services/school-courses.helpers";
import { SchoolAdminModuleHeader } from "@/modules/school-admin/components/SchoolAdminModuleHeader";

interface SchoolCoursesPageProps {
  courses: VsSchoolCourse[];
  onAddCourse?: (data: Partial<VsSchoolCourse>) => Promise<boolean>;
  onToggleStatus?: (courseId: number, status: string) => Promise<boolean>;
}

export function SchoolCoursesPage({
  courses: initialCourses,
  onAddCourse,
  onToggleStatus,
}: SchoolCoursesPageProps) {
  const {
    courses,
    saving,
    editingCourse,
    setEditingCourse,
    addCourse,
    updateCourse,
    toggleStatus,
    deleteCourse,
  } = useSchoolCourses(initialCourses, onAddCourse, onToggleStatus);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredData = useMemo(() => {
    return filterCourses(courses, searchQuery, statusFilter);
  }, [courses, searchQuery, statusFilter]);

  const columns = useMemo<ColumnDef<VsSchoolCourse>[]>(
    () => [
      {
        accessorKey: "course_code",
        header: "Course Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {formatCourseCode(row.original.course_code)}
          </span>
        ),
      },
      {
        accessorKey: "course_name",
        header: "Course Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.course_name}</span>
        ),
      },
      {
        accessorKey: "course_status",
        header: "Status",
        cell: ({ row }) => {
          const status: SchoolStatus = row.original.course_status;
          return (
            <Badge variant={getCourseStatusBadgeVariant(status)}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Date Created",
        cell: ({ row }) => {
          if (!row.original.created_at) return "N/A";
          return new Date(row.original.created_at).toLocaleDateString();
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const course = row.original;
          const isActive = course.course_status === "Active";

          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setEditingCourse(course)}>
                    <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleStatus(course.school_course_id, course.course_status)}>
                    <Power className={`mr-2 h-4 w-4 ${isActive ? 'text-amber-500' : 'text-emerald-500'}`} />
                    {isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${course.course_name}"?`)) {
                        deleteCourse(course.school_course_id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courses]
  );

  return (
    <div className="p-6 space-y-6">
      <SchoolAdminModuleHeader
        title="Course Management"
        description="Manage your institution's course directory, status availability, and offerings."
        icon={BookOpen}
      />

      <CoursesDataTable
        columns={columns}
        data={filteredData}
        searchPlaceholder="Search course name or code..."
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        toolbarActions={
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        }
      />

      <AddCourseModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={async (data) => await addCourse(data)}
        saving={saving}
      />

      <EditCourseModal
        course={editingCourse}
        isOpen={!!editingCourse}
        onOpenChange={(open) => {
          if (!open) setEditingCourse(null);
        }}
        onSubmit={async (id, data) => await updateCourse(id, data)}
        saving={saving}
      />
    </div>
  );
}
