'use client';

import React, { useState } from 'react';
import { VsSchoolStudent } from '../types/student-roster.types';
import { CreateStudentInput, createStudentSchema } from '../types/student-roster.schema';
import { VsSchoolCourse } from '@/modules/school-admin/types/school-admin.types';
import { generateSchoolYearOptions } from '../utils/school-year.utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
    first_name: student?.first_name || '',
    middle_name: student?.middle_name || '',
    last_name: student?.last_name || '',
    email: student?.email || '',
    student_number: student?.student_number || '',
    school_course_id: student?.school_course_id ? Number(student.school_course_id) : null,
    school_year: student?.school_year || '2025-2026',
    gpa: student?.gpa ?? null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update student';
      setErrors({ form: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <h2 className="text-lg font-bold text-foreground">Edit Student Record</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.form && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[1.5rem]">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[1.5rem]">
                Middle Name (Optional)
              </label>
              <input
                type="text"
                value={formData.middle_name || ''}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[1.5rem]">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Student Number
              </label>
              <input
                type="text"
                value={formData.student_number || ''}
                onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                School Year *
              </label>
              <select
                value={formData.school_year}
                onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              {errors.school_year && <p className="text-xs text-destructive mt-1">{errors.school_year}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
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
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
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
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
