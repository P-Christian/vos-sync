'use client';

import React from 'react';
import { VsSchoolCourse } from '@/modules/school-admin/types/school-admin.types';

interface RosterFiltersProps {
  selectedSchoolYear: string;
  onSchoolYearChange: (year: string) => void;
  selectedCourseId: string;
  onCourseChange: (courseId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  courses: VsSchoolCourse[];
  availableSchoolYears: string[];
}

export const RosterFilters: React.FC<RosterFiltersProps> = ({
  selectedSchoolYear,
  onSchoolYearChange,
  selectedCourseId,
  onCourseChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  courses,
  availableSchoolYears,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, student #, email..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Select Filters Group */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {/* School Year Filter */}
        <select
          value={selectedSchoolYear}
          onChange={(e) => onSchoolYearChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All School Years</option>
          {availableSchoolYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
          {!availableSchoolYears.includes('2025-2026') && (
            <option value="2025-2026">2025-2026</option>
          )}
          {!availableSchoolYears.includes('2024-2025') && (
            <option value="2024-2025">2024-2025</option>
          )}
        </select>

        {/* Course Filter */}
        <select
          value={selectedCourseId}
          onChange={(e) => onCourseChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.school_course_id} value={course.school_course_id}>
              {course.course_name} ({course.course_code || 'N/A'})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Not Sent">Not Sent</option>
          <option value="Invited">Invited</option>
          <option value="Registered">Registered</option>
        </select>
      </div>
    </div>
  );
};
