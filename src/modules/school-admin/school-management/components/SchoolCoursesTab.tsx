// src/modules/school-admin/school-management/components/SchoolCoursesTab.tsx
"use client";

import React, { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { SchoolStatusBadge } from "./SchoolStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VsSchoolCourse } from "../types/school.types";

interface Props {
  schoolId: number;
  courses: VsSchoolCourse[];
  onAddCourse: (data: any) => Promise<any>;
  onToggleStatus: (courseId: number, currentStatus: string) => Promise<any>;
}

export function SchoolCoursesTab({ schoolId, courses, onAddCourse, onToggleStatus }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveNew = async () => {
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
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Offered Courses</h3>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Course
          </Button>
        )}
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
            {isAdding && (
              <tr className="border-b bg-muted/20">
                <td className="p-2">
                  <Input 
                    placeholder="e.g. Bachelor of Science in Information Technology" 
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    disabled={loading}
                  />
                </td>
                <td className="p-2">
                  <Input 
                    placeholder="e.g. BSIT" 
                    value={newCourseCode}
                    onChange={e => setNewCourseCode(e.target.value)}
                    disabled={loading}
                  />
                </td>
                <td className="p-2">
                  <span className="text-xs text-muted-foreground">Active (Default)</span>
                </td>
                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={loading}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveNew} disabled={loading || !newCourseName.trim()}>
                      {loading ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            
            {courses.length === 0 && !isAdding ? (
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
