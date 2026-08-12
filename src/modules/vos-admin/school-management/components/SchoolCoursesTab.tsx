// src/modules/vos-admin/school-management/components/SchoolCoursesTab.tsx
"use client";

import React, { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { SchoolStatusBadge } from "./SchoolStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VsSchoolCourse } from "../types/school.types";
import { CourseFormBuilder } from "@/components/courses/CourseFormBuilder";

interface Props {
  schoolId: number;
  courses: VsSchoolCourse[];
  onAddCourse: (data: unknown) => Promise<unknown>;
  onToggleStatus: (courseId: number, currentStatus: string) => Promise<unknown>;
}

export function SchoolCoursesTab({ courses, onAddCourse, onToggleStatus }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    setLoading(true);
    const success = await onAddCourse({
      course_name: newCourseName,
      course_code: newCourseCode || null,
    });
    setLoading(false);
    if (success) {
      setNewCourseName("");
      setNewCourseCode("");
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Offered Courses</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveNew} className="space-y-4 pt-2">
              <CourseFormBuilder
                courseName={newCourseName}
                courseCode={newCourseCode}
                onChangeName={setNewCourseName}
                onChangeCode={setNewCourseCode}
                disabled={loading}
              />
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !newCourseName.trim()}>
                  {loading ? "Saving..." : "Save Course"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
              <th className="p-4">Course Name</th>
              <th className="p-4">Course Code</th>
              <th className="p-4">Status</th>
              <th className="p-4 w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No courses added yet.
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.school_course_id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{course.course_name}</td>
                  <td className="p-4">{course.course_code || "-"}</td>
                  <td className="p-4">
                    <SchoolStatusBadge status={course.course_status} />
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onToggleStatus(course.school_course_id, course.course_status)}>
                          {course.course_status === "Active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
