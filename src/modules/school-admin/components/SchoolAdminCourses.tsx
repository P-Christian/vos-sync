import { useState } from "react";
import { VsSchoolCourse } from "../types/school-admin.types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function SchoolAdminCourses({
  courses,
  onAddCourse,
  onToggleStatus
}: {
  courses: VsSchoolCourse[],
  onAddCourse: (data: Partial<VsSchoolCourse>) => Promise<boolean>,
  onToggleStatus: (courseId: number, status: string) => Promise<boolean>
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await onAddCourse({
      course_name: courseName,
      course_code: courseCode || null
    });
    setSaving(false);
    if (success) {
      toast.success("Course added successfully.");
      setIsOpen(false);
      setCourseName("");
      setCourseCode("");
    }
  };

  const handleToggle = async (id: number, currentStatus: string) => {
    const success = await onToggleStatus(id, currentStatus);
    if (success) {
      toast.success("Course status updated.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Courses Overview</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name</Label>
                <Input 
                  id="courseName" 
                  value={courseName} 
                  onChange={e => setCourseName(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code (Optional)</Label>
                <Input 
                  id="courseCode" 
                  value={courseCode} 
                  onChange={e => setCourseCode(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  Save Course
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Code</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No courses found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.school_course_id}>
                  <TableCell className="font-medium">{course.course_code || "-"}</TableCell>
                  <TableCell>{course.course_name}</TableCell>
                  <TableCell>
                    <Badge variant={course.course_status === 'Active' ? 'default' : 'secondary'}>
                      {course.course_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggle(course.school_course_id, course.course_status)}
                    >
                      {course.course_status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
