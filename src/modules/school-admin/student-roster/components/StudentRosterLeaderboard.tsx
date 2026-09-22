'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';
import { VsSchoolStudent } from '../types/student-roster.types';
import { VsSchoolCourse } from '@/modules/school-admin/types/school-admin.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StudentRosterLeaderboardProps {
  students: VsSchoolStudent[];
  courses: VsSchoolCourse[];
  selectedCourseId: string;
  selectedSchoolYear: string;
  isLoading?: boolean;
}

export const StudentRosterLeaderboard: React.FC<StudentRosterLeaderboardProps> = ({
  students,
  courses,
  selectedCourseId,
  selectedSchoolYear,
  isLoading,
}) => {
  const [limit, setLimit] = useState<number>(10);

  // Filter students who have a valid numerical GPA and rank them using dense ranking
  const rankedStudents = useMemo(() => {
    const valid = students.filter(
      (s) => s.gpa !== null && s.gpa !== undefined && !isNaN(Number(s.gpa))
    );

    // Sort ascending: lowest GPA value is the highest rank (#1)
    const sorted = [...valid].sort((a, b) => {
      const gpaDiff = Number(a.gpa) - Number(b.gpa);
      if (gpaDiff !== 0) return gpaDiff;
      return (a.last_name || '').localeCompare(b.last_name || '');
    });

    // Assign Dense Rank
    let currentDenseRank = 1;
    return sorted.map((student, index) => {
      if (index > 0) {
        const prev = sorted[index - 1];
        if (Number(student.gpa) === Number(prev.gpa)) {
          // Tied with previous -> shares same rank
          return { ...student, leaderboard_rank: currentDenseRank };
        } else {
          currentDenseRank += 1;
          return { ...student, leaderboard_rank: currentDenseRank };
        }
      } else {
        currentDenseRank = 1;
        return { ...student, leaderboard_rank: 1 };
      }
    });
  }, [students]);

  const displayedStudents = useMemo(() => {
    return rankedStudents.slice(0, limit);
  }, [rankedStudents, limit]);

  const topThree = displayedStudents.slice(0, 3);
  const remainingStudents = displayedStudents.slice(3);

  // Active filter label
  const selectedCourseName = useMemo(() => {
    if (selectedCourseId === 'all') return 'All Courses';
    const found = courses.find((c) => String(c.school_course_id) === String(selectedCourseId));
    return found?.course_name || 'Selected Course';
  }, [selectedCourseId, courses]);

  const selectedYearLabel = selectedSchoolYear === 'all' ? 'All School Years' : `S.Y. ${selectedSchoolYear}`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-muted/40 animate-pulse rounded-2xl" />
        <div className="h-64 bg-muted/30 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (rankedStudents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <Trophy className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">No Ranked Students Available</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No students in {selectedCourseName} ({selectedYearLabel}) have a recorded GPA yet. Add or edit student records with valid GPAs to generate leaderboard rankings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leaderboard Header Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Academic Leaderboard</h2>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 mr-1" />
                Top Performers
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{selectedCourseName}</span>
              <span>•</span>
              <span>{selectedYearLabel}</span>
              <span>•</span>
              <span>Sorted by GPA (Lowest is Top)</span>
            </p>
          </div>
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Display:</span>
          <Select value={String(limit)} onValueChange={(val) => setLimit(Number(val))}>
            <SelectTrigger className="w-[170px] h-9 text-xs font-medium">
              <SelectValue placeholder="Select limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Top 10 Students</SelectItem>
              <SelectItem value="20">Top 20 Students</SelectItem>
              <SelectItem value="50">Top 50 Students</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((student) => {
            const rank = student.leaderboard_rank;
            const isGold = rank === 1;
            const isSilver = rank === 2;

            const cardBorder = isGold
              ? 'border-amber-500/30 dark:border-amber-500/25 ring-1 ring-amber-500/15'
              : isSilver
              ? 'border-slate-300 dark:border-slate-700 ring-1 ring-slate-400/15'
              : 'border-orange-500/30 dark:border-orange-500/25 ring-1 ring-orange-500/15';

            const badgeStyle = isGold
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : isSilver
              ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30'
              : 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30';

            const icon = isGold ? (
              <Trophy className="w-4 h-4 text-amber-500" />
            ) : isSilver ? (
              <Medal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            ) : (
              <Award className="w-4 h-4 text-orange-500" />
            );

            return (
              <div
                key={student.student_id}
                className={`relative rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-sm ${cardBorder}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}
                  >
                    {icon}
                    <span>#{rank}</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {isGold ? '1st Place' : isSilver ? '2nd Place' : '3rd Place'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm truncate">
                    {student.last_name}, {student.first_name}
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {student.student_number || '—'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-medium text-foreground/80 truncate">
                      {student.course_name || '—'}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {student.school_year}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                      GPA
                    </span>
                    <span className="font-mono text-base font-extrabold text-foreground">
                      {Number(student.gpa).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks 4 to N Table */}
      {remainingStudents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Ranks 4 to {Math.min(limit, rankedStudents.length)}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Showing {displayedStudents.length} of {rankedStudents.length} ranked students
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 font-bold">Rank</TableHead>
                <TableHead className="w-32 font-bold">Student #</TableHead>
                <TableHead className="font-bold">Student Name</TableHead>
                <TableHead className="font-bold">Course</TableHead>
                <TableHead className="w-28 font-bold">School Year</TableHead>
                <TableHead className="w-24 text-right font-bold">GPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remainingStudents.map((student) => (
                <TableRow key={student.student_id} className="hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-muted text-muted-foreground border border-border/50">
                      #{student.leaderboard_rank}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {student.student_number || '—'}
                  </TableCell>
                  <TableCell className="font-medium text-foreground text-sm">
                    {student.last_name}, {student.first_name}
                  </TableCell>
                  <TableCell className="text-foreground/90 text-xs">
                    {student.course_name || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {student.school_year}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                    {Number(student.gpa).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
