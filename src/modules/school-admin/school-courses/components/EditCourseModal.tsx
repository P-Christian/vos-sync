"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { VsSchoolCourse, SchoolStatus } from "@/modules/school-admin/types/school-admin.types";
import { updateCourseSchema } from "../types/school-courses.schema";

interface EditCourseModalProps {
  course: VsSchoolCourse | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (courseId: number, data: { course_name: string; course_code?: string | null; course_status?: SchoolStatus }) => Promise<boolean>;
  saving: boolean;
}

export function EditCourseModal({ course, isOpen, onOpenChange, onSubmit, saving }: EditCourseModalProps) {
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [status, setStatus] = useState<SchoolStatus>("Active");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setCourseName(course.course_name || "");
      setCourseCode(course.course_code || "");
      setStatus(course.course_status || "Active");
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setError(null);
    const parsed = updateCourseSchema.safeParse({
      course_name: courseName,
      course_code: courseCode || null,
      course_status: status,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Validation failed");
      return;
    }

    const success = await onSubmit(course.school_course_id, {
      course_name: courseName.trim(),
      course_code: courseCode.trim() || null,
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
            <Label htmlFor="edit_course_name">Course Name</Label>
            <Input 
              id="edit_course_name" 
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_course_code">Course Code</Label>
            <Input 
              id="edit_course_code" 
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_course_status">Status</Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger id="edit_course_status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
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
