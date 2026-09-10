'use client';

import { useState, useEffect, useCallback } from 'react';
import { VsSchoolStudent, StudentRosterFilter } from '../types/student-roster.types';
import { CreateStudentInput } from '../types/student-roster.schema';
import { VsSchoolCourse } from '@/modules/school-admin/types/school-admin.types';
import { generateSchoolYearOptions } from '../utils/school-year.utils';

export function useStudentRoster() {
  const [students, setStudents] = useState<VsSchoolStudent[]>([]);
  const [courses, setCourses] = useState<VsSchoolCourse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch courses for dropdown
  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/school-admin/school/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || data || []);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Fetch student roster
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedSchoolYear !== 'all') params.append('school_year', selectedSchoolYear);
      if (selectedCourseId !== 'all') params.append('school_course_id', selectedCourseId);
      if (selectedStatus !== 'all') params.append('invitation_status', selectedStatus);
      if (searchQuery.trim()) params.append('search_query', searchQuery.trim());

      const res = await fetch(`/api/school-admin/students?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch student roster');
      }

      const json = await res.json();
      setStudents(json.data || []);
      setTotalCount(json.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading roster');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchoolYear, selectedCourseId, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Actions
  const addStudent = async (input: CreateStudentInput) => {
    const res = await fetch('/api/school-admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add student');
    }

    await fetchStudents();
  };

  const editStudent = async (studentId: number, input: Partial<CreateStudentInput>) => {
    const res = await fetch(`/api/school-admin/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update student');
    }

    await fetchStudents();
  };

  const bulkUploadStudents = async (inputList: CreateStudentInput[]) => {
    const res = await fetch('/api/school-admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputList),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload students');
    }

    await fetchStudents();
  };

  const deleteStudent = async (studentId: number) => {
    const res = await fetch(`/api/school-admin/students/${studentId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete student');
    }

    await fetchStudents();
  };

  // Maintain accumulated list of all available school years
  const [accumulatedYears, setAccumulatedYears] = useState<string[]>([]);

  useEffect(() => {
    if (students.length > 0) {
      const fetchedYears = students.map((s) => s.school_year).filter(Boolean);
      setAccumulatedYears((prev) => Array.from(new Set([...prev, ...fetchedYears])));
    }
  }, [students]);

  const defaultGeneratedYears = generateSchoolYearOptions();
  const availableSchoolYears = Array.from(
    new Set([...defaultGeneratedYears, ...accumulatedYears])
  ).sort().reverse();

  return {
    students,
    courses,
    totalCount,
    isLoading,
    error,
    selectedSchoolYear,
    setSelectedSchoolYear,
    selectedCourseId,
    setSelectedCourseId,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    availableSchoolYears,
    refreshRoster: fetchStudents,
    addStudent,
    editStudent,
    bulkUploadStudents,
    deleteStudent,
  };
}
