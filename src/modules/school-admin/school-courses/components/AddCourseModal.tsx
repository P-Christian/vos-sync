"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createCourseSchema } from "../types/school-courses.schema";

interface AddCourseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { course_name: string; course_code?: string | null }) => Promise<boolean>;
  saving: boolean;
}

export function AddCourseModal({ isOpen, onOpenChange, onSubmit, saving }: AddCourseModalProps) {
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = createCourseSchema.safeParse({
      course_name: courseName,
      course_code: courseCode || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Validation failed");
      return;
    }

    const success = await onSubmit({
      course_name: courseName.trim(),
      course_code: courseCode.trim() || null,
    });

    if (success) {
      setCourseName("");
      setCourseCode("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="add_course_name">Course Name</Label>
            <Input 
              id="add_course_name" 
              placeholder="e.g. BS Information Technology" 
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add_course_code">Course Code (Optional)</Label>
            <Input 
              id="add_course_code" 
              placeholder="e.g. BSIT" 
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
