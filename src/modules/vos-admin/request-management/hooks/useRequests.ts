"use client";

import { useState, useCallback } from 'react';
import { VsSchoolRequest, VsCourseRequest, ReviewAction } from '../types/request.types';

export function useRequests() {
  const [schoolRequests, setSchoolRequests] = useState<VsSchoolRequest[]>([]);
  const [courseRequests, setCourseRequests] = useState<VsCourseRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchoolRequests = useCallback(async (status: string = 'Pending') => {
    setLoading(true);
    setError(null);
    try {
      const q = status !== 'ALL' ? `?status=${status}` : '';
      const res = await fetch(`/api/vos-admin/school-requests${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch school requests');
      setSchoolRequests(json.requests ?? []);
    } catch (err: unknown) {
      setError((err as Error).message);
      setSchoolRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourseRequests = useCallback(async (status: string = 'Pending') => {
    setLoading(true);
    setError(null);
    try {
      const q = status !== 'ALL' ? `?status=${status}` : '';
      const res = await fetch(`/api/vos-admin/course-requests${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch course requests');
      setCourseRequests(json.requests ?? []);
    } catch (err: unknown) {
      setError((err as Error).message);
      setCourseRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchoolRequest = async (data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): Promise<boolean> => {
    try {
      const res = await fetch('/api/vos-admin/school-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create school request');
      }
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  };

  const createCourseRequest = async (data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): Promise<boolean> => {
    try {
      const res = await fetch('/api/vos-admin/course-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create course request');
      }
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  };

  const reviewSchoolRequest = async (id: number, data: ReviewAction): Promise<boolean> => {
    try {
      const res = await fetch(`/api/vos-admin/school-requests/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to review school request');
      }
      
      const json = await res.json();
      
      // Optimistic update
      setSchoolRequests(prev => prev.map(r => r.school_request_id === id ? json.request : r));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  };

  const reviewCourseRequest = async (id: number, data: ReviewAction): Promise<boolean> => {
    try {
      const res = await fetch(`/api/vos-admin/course-requests/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to review course request');
      }
      
      const json = await res.json();
      
      // Optimistic update
      setCourseRequests(prev => prev.map(r => r.course_request_id === id ? json.request : r));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message);
      return false;
    }
  };

  return {
    schoolRequests,
    courseRequests,
    loading,
    error,
    fetchSchoolRequests,
    fetchCourseRequests,
    createSchoolRequest,
    createCourseRequest,
    reviewSchoolRequest,
    reviewCourseRequest,
  };
}
