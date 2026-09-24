// src/modules/school-admin/success-metrics/services/success-metrics.service.ts
import {
  SuccessMetricsFilter,
  SuccessMetricsResponse,
} from '../types/success-metrics.types';
import {
  fetchJobApplicationsForUsersRepo,
  fetchSchoolCoursesRepo,
  fetchSchoolStudentsRepo,
} from './success-metrics.repo';
import {
  buildCoursePlacementStats,
  buildFunnelStageStats,
  buildSalaryDistribution,
  buildTopHiringCompanies,
  calculateKpis,
} from './success-metrics.helpers';

export async function getSchoolSuccessMetrics(filter: SuccessMetricsFilter): Promise<SuccessMetricsResponse> {
  // 1. Fetch school courses & students in parallel
  const [rawCourses, rawStudents] = await Promise.all([
    fetchSchoolCoursesRepo(filter.school_id),
    fetchSchoolStudentsRepo(filter),
  ]);

  // Extract unique school years for filter dropdowns
  const availableYearsSet = new Set<string>();
  rawStudents.forEach((s) => {
    if (s.school_year && typeof s.school_year === 'string' && s.school_year.trim()) {
      availableYearsSet.add(s.school_year.trim());
    }
  });
  const availableSchoolYears = Array.from(availableYearsSet).sort().reverse();

  // 2. Fetch applications with joined job & company details in single trip
  const registeredUserIds = rawStudents
    .map((s) => (s.registered_user_id ? Number(s.registered_user_id) : null))
    .filter((id): id is number => id !== null && !isNaN(id) && id > 0);

  const rawApplications = await fetchJobApplicationsForUsersRepo(registeredUserIds);

  // 3. Calculate stats via pure helpers in-memory
  const courseStats = buildCoursePlacementStats(rawCourses, rawStudents, rawApplications);
  const kpis = calculateKpis(rawStudents, rawApplications, courseStats);
  const funnelStages = buildFunnelStageStats(rawApplications);
  const topCompanies = buildTopHiringCompanies(rawApplications);
  const salaryDistribution = buildSalaryDistribution(rawApplications);

  return {
    kpis,
    courseStats,
    funnelStages,
    topCompanies,
    salaryDistribution,
    availableSchoolYears,
  };
}
