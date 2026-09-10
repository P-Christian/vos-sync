'use client';

import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useStudentRoster } from './hooks/useStudentRoster';
import { RosterFilters } from './components/RosterFilters';
import { StudentRosterTable } from './components/StudentRosterTable';
import { AddStudentModal } from './components/AddStudentModal';
import { EditStudentModal } from './components/EditStudentModal';
import { BulkUploadModal } from './components/BulkUploadModal';
import { VsSchoolStudent } from './types/student-roster.types';
import { SchoolAdminModuleHeader } from '@/modules/school-admin/components/SchoolAdminModuleHeader';

export const StudentRosterPage: React.FC = () => {
  const {
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
    addStudent,
    editStudent,
    bulkUploadStudents,
    deleteStudent,
  } = useStudentRoster();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<VsSchoolStudent | null>(null);

  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6">
      {/* Header Section */}
      <SchoolAdminModuleHeader
        title="Student Roster Directory"
        description="Manage your school's student directory, filter by academic course or school year, and track registration status."
        icon={GraduationCap}
        actions={
          <>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-slate-100 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span>📥</span> Bulk Upload (CSV)
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span>➕</span> Add Student
            </button>
          </>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <RosterFilters
        selectedSchoolYear={selectedSchoolYear}
        onSchoolYearChange={setSelectedSchoolYear}
        selectedCourseId={selectedCourseId}
        onCourseChange={setSelectedCourseId}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        courses={courses}
        availableSchoolYears={availableSchoolYears}
      />

      {/* Roster Data Table */}
      <StudentRosterTable
        students={students}
        isLoading={isLoading}
        onEdit={(student) => setEditingStudent(student)}
        onDelete={deleteStudent}
      />

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={addStudent}
        courses={courses}
      />

      <EditStudentModal
        isOpen={!!editingStudent}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSuccess={editStudent}
        courses={courses}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={bulkUploadStudents}
      />
    </div>
  );
};
