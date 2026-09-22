"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { VsSchoolCourse, CourseDegree, CourseStatus } from "@/modules/school-admin/types/school-admin.types";
import { UpdateCourseDTO } from "../types/school-courses.types";
import { updateCourseSchema } from "../types/school-courses.schema";

interface EditCourseModalProps {
  course: VsSchoolCourse | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (courseId: number, data: UpdateCourseDTO) => Promise<boolean>;
  saving: boolean;
}

export function EditCourseModal({ course, isOpen, onOpenChange, onSubmit, saving }: EditCourseModalProps) {
  const [courseName, setCourseName] = useState(course?.course_name || "");
  const [courseCode, setCourseCode] = useState(course?.course_code || "");
  const [degree, setDegree] = useState<CourseDegree | "">((course?.degree as CourseDegree) || "");
  const [status, setStatus] = useState<CourseStatus>((course?.course_status as CourseStatus) || "Active");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setCourseName(course.course_name || "");
      setCourseCode(course.course_code || "");
      setDegree((course.degree as CourseDegree) || "");
      setStatus(course.course_status === "Inactive" ? "Inactive" : "Active");
      setError(null);
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setError(null);

    if (!degree) {
      setError("Please select a degree level.");
      return;
    }

    const parsed = updateCourseSchema.safeParse({
      course_name: courseName,
      course_code: courseCode || null,
      degree: degree as CourseDegree,
      course_status: status,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Validation failed");
      return;
    }

    const success = await onSubmit(course.school_course_id, {
      course_name: courseName.trim(),
      course_code: courseCode.trim() || null,
      degree: degree as CourseDegree,
      course_status: status,
    });

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit_course_name">Course Name *</Label>
            <Input 
              id="edit_course_name" 
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_degree">Degree Level *</Label>
            <Select value={degree} onValueChange={(val: string) => setDegree(val as CourseDegree)}>
              <SelectTrigger id="edit_degree">
                <SelectValue placeholder="Select degree level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Associate">Associate</SelectItem>
                <SelectItem value="Bachelor">Bachelor</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="Doctorate">Doctorate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_course_code">Course Code (Optional)</Label>
            <Input 
              id="edit_course_code" 
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_course_status">Status</Label>
            <Select value={status} onValueChange={(val: string) => setStatus(val as CourseStatus)}>
              <SelectTrigger id="edit_course_status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

