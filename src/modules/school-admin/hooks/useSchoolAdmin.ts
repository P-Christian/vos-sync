import { useState, useCallback } from 'react';
import { SchoolWithStats, VsSchoolCourse, VsSchool } from '../types/school-admin.types';

export function useSchoolAdmin() {
  const [school, setSchool] = useState<SchoolWithStats | null>(null);
  const [courses, setCourses] = useState<VsSchoolCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMySchool = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/school-admin/me');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch school details.');
      setSchool(json.school);
      return json.school;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred while fetching school.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/school-admin/school/courses');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch courses.');
      setCourses(json.courses || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred while fetching courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSchool = async (data: Partial<VsSchool>) => {
    try {
      const res = await fetch('/api/school-admin/school', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update school.');
      setSchool(prev => prev ? { ...prev, ...json.school } : null);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to update school.');
      return false;
    }
  };

  const addCourse = async (data: Partial<VsSchoolCourse>) => {
    try {
      const res = await fetch('/api/school-admin/school/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create course.');
      setCourses(prev => [json.course, ...prev]);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create course.');
      return false;
    }
  };

  const toggleCourseStatus = async (courseId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const res = await fetch(`/api/school-admin/school/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update course status.');
      
      setCourses(prev => prev.map(c => c.school_course_id === courseId ? { ...c, ...json.course } : c));
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to update course status.');
      return false;
    }
  };

  return {
    school,
    courses,
    loading,
    error,
    fetchMySchool,
    fetchMyCourses,
    updateSchool,
    addCourse,
    toggleCourseStatus
  };
}
