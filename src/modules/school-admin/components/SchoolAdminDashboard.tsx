import { Building2, GraduationCap, Users, AlertCircle } from "lucide-react";
import { SchoolWithStats } from "../types/school-admin.types";
import Link from "next/link";

export function SchoolAdminDashboard({ school }: { school: SchoolWithStats }) {
  const isDraft = school.school_status === "Draft";
  const completion = school.profile_completion_percent || 0;

  return (
    <div className="p-6 space-y-6">
      {isDraft && (
        <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 shadow-sm animate-pulse">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-950">Draft Account - Approval Pending</h4>
            <p className="text-sm text-amber-800">
              Your school account is currently pending VOS-Sync admin approval. You can complete your school details to speed up the review.
            </p>
          </div>
        </div>
      )}

      <header className="mb-4 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">School Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your school profile and courses.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">My School</h3>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0 flex flex-col gap-2">
            <div className="text-2xl font-bold truncate">{school.school_name}</div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                completion === 100
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : completion >= 70
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : completion >= 40
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {completion}% Complete
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Courses</h3>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{school.course_count}</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Enrolled Students</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{school.student_count}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

