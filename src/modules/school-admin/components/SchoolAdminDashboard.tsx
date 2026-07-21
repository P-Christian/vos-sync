import { Building2, GraduationCap, Users } from "lucide-react";
import { SchoolWithStats } from "../types/school-admin.types";

export function SchoolAdminDashboard({ school }: { school: SchoolWithStats }) {
  return (
    <div className="p-6">
      <header className="mb-8 border-b pb-4">
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
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold truncate">{school.school_name}</div>
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
