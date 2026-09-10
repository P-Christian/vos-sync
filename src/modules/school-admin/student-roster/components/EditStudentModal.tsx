'use client';

import React, { useState, useEffect } from 'react';
import { VsSchoolStudent } from '../types/student-roster.types';
import { CreateStudentInput, createStudentSchema } from '../types/student-roster.schema';
import { VsSchoolCourse } from '@/modules/school-admin/types/school-admin.types';
import { generateSchoolYearOptions } from '../utils/school-year.utils';

interface EditStudentModalProps {
  isOpen: boolean;
  student: VsSchoolStudent | null;
  onClose: () => void;
  onSuccess: (studentId: number, data: Partial<CreateStudentInput>) => Promise<void>;
  courses: VsSchoolCourse[];
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onSuccess,
  courses,
}) => {
  const schoolYearOptions = generateSchoolYearOptions();

  const [formData, setFormData] = useState<CreateStudentInput>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    student_number: '',
    school_course_id: null,
    school_year: '2025-2026',
    gpa: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name || '',
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        student_number: student.student_number || '',
        school_course_id: student.school_course_id ? Number(student.school_course_id) : null,
        school_year: student.school_year || '2025-2026',
        gpa: student.gpa ?? null,
      });
      setErrors({});
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createStudentSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSuccess(student.student_id, result.data);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to update student' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Edit Student Record</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.form && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 min-h-[1.5rem]">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 min-h-[1.5rem]">
                Middle Name (Optional)
              </label>
              <input
                type="text"
                value={formData.middle_name || ''}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 min-h-[1.5rem]">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student Number
              </label>
              <input
                type="text"
                value={formData.student_number || ''}
                onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                School Year *
              </label>
              <select
                value={formData.school_year}
                onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* Include custom student school_year if not in list */}
                {formData.school_year && !schoolYearOptions.includes(formData.school_year) && (
                  <option value={formData.school_year}>{formData.school_year}</option>
                )}
                {schoolYearOptions.map((sy) => (
                  <option key={sy} value={sy}>
                    {sy}
                  </option>
                ))}
              </select>
              {errors.school_year && <p className="text-xs text-red-500 mt-1">{errors.school_year}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course
              </label>
              <select
                value={formData.school_course_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    school_course_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Course...</option>
                {courses.map((course) => (
                  <option key={course.school_course_id} value={course.school_course_id}>
                    {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                GPA (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5.0"
                value={formData.gpa ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gpa: e.target.value !== '' ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
