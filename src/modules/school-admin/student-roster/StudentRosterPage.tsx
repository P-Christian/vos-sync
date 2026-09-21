'use client';

import React, { useState } from 'react';
import { GraduationCap, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudentRoster } from './hooks/useStudentRoster';
import { RosterFilters } from './components/RosterFilters';
import { StudentRosterTable } from './components/StudentRosterTable';
import { AddStudentModal } from './components/AddStudentModal';
import { EditStudentModal } from './components/EditStudentModal';
import { BulkUploadModal } from './components/BulkUploadModal';
import { VsSchoolStudent } from './types/student-roster.types';
import { SchoolAdminModuleHeader } from '@/modules/school-admin/components/SchoolAdminModuleHeader';

import { StudentRosterSkeleton } from '@/modules/school-admin/components/SchoolAdminSkeleton';

export const StudentRosterPage: React.FC = () => {
  const {
    students,
    courses,
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

  if (isLoading && students.length === 0) {
    return <StudentRosterSkeleton />;
  }

  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6">
      {/* Header Section */}
      <SchoolAdminModuleHeader
        title="Student Roster Directory"
        description="Manage your school's student directory, filter by academic course or school year, and track registration status."
        icon={GraduationCap}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:text-white shadow-sm"
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>
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
