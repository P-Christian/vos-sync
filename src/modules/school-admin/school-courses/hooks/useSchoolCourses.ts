import { useState, useCallback } from 'react';
import { VsSchoolCourse, SchoolStatus } from '@/modules/school-admin/types/school-admin.types';
import { 
  executeCreateSchoolCourse, 
  executeUpdateSchoolCourse, 
  executeToggleCourseStatus, 
  executeDeleteSchoolCourse 
} from '../services/school-courses.service';
import { toast } from 'sonner';

export function useSchoolCourses(
  initialCourses: VsSchoolCourse[] = [],
  onAddCourseProp?: (data: Partial<VsSchoolCourse>) => Promise<boolean>,
  onToggleStatusProp?: (courseId: number, status: string) => Promise<boolean>
) {
  const [courses, setCourses] = useState<VsSchoolCourse[]>(initialCourses);
  const [saving, setSaving] = useState(false);
  const [editingCourse, setEditingCourse] = useState<VsSchoolCourse | null>(null);

  const addCourse = async (data: { course_name: string; course_code?: string | null }): Promise<boolean> => {
    setSaving(true);
    try {
      if (onAddCourseProp) {
        const success = await onAddCourseProp(data);
        if (success) {
          toast.success('Course added successfully.');
        }
        return success;
      }

      const created = await executeCreateSchoolCourse(data);
      setCourses(prev => [created, ...prev]);
      toast.success('Course added successfully.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to add course.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateCourse = async (courseId: number, data: { course_name: string; course_code?: string | null; course_status?: SchoolStatus }): Promise<boolean> => {
    setSaving(true);
    try {
      const updated = await executeUpdateSchoolCourse(courseId, data);
      setCourses(prev => prev.map(c => c.school_course_id === courseId ? updated : c));
      toast.success('Course updated successfully.');
      setEditingCourse(null);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update course.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (courseId: number, currentStatus: SchoolStatus): Promise<boolean> => {
    try {
      if (onToggleStatusProp) {
        const success = await onToggleStatusProp(courseId, currentStatus);
        if (success) {
          setCourses(prev => prev.map(c => {
            if (c.school_course_id === courseId) {
              return { ...c, course_status: currentStatus === 'Active' ? 'Inactive' : 'Active' };
            }
            return c;
          }));
          toast.success('Course status updated.');
        }
        return success;
      }

      const updated = await executeToggleCourseStatus(courseId, currentStatus);
      setCourses(prev => prev.map(c => c.school_course_id === courseId ? updated : c));
      toast.success('Course status updated.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
      return false;
    }
  };

  const deleteCourse = async (courseId: number): Promise<boolean> => {
    try {
      await executeDeleteSchoolCourse(courseId);
      setCourses(prev => prev.filter(c => c.school_course_id !== courseId));
      toast.success('Course deleted successfully.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete course.');
      return false;
    }
  };

  return {
    courses,
    setCourses,
    saving,
    editingCourse,
    setEditingCourse,
    addCourse,
    updateCourse,
    toggleStatus,
    deleteCourse
  };
}
